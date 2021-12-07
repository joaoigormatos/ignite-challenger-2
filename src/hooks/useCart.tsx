import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const thereIsProduct = cart.find(({ id }) => id === productId);

      if (thereIsProduct) {
        const { data } = await api.get<Stock>(`stock/${productId}`);
        
        const total = thereIsProduct.amount + 1;

        if (total > data.amount) {
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        const newCart = cart.map((item) => item.id === productId? ({
          ...item,
          amount: total,
        }) : item);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);

        return;
      }

      const { data } = await api.get<Product>(`products/${productId}`);
        
      setCart(oldCart => {
        const newCart = [...oldCart, {...data, amount: 1}];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);
      if (!productInCart) {
        throw Error("Produto não encontrado.");
      }
      const filteredCart = cart.filter((product) => product.id !== productId);
      setCart(filteredCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //Get the item on the stock
      if (amount < 0) {
        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const productInStock = response.data as Stock;
   
      const productInCardIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productInCardIndex === -1) {
        throw Error("Produto não encontrado no carrinho");
      }

      if (cart[productInCardIndex].amount === 1 && amount === 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (amount > productInStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart[productInCardIndex].amount = amount;

      setCart([...cart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
