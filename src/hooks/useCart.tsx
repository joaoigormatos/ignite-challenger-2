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
      const productResponse = await api.get(`/products/${productId}`);
      if (!productResponse.data) {
        throw Error("Quantidade solicitada fora de estoque");
      }
      const stockResponse = await api.get(`/stock/${productId}`);

      const productInStock = stockResponse.data as Stock;

      if (!productInStock || !productInStock.amount) {
        throw Error("Quantidade solicitada fora de estoque");
      }

      const productInCardIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productInCardIndex >= 0) {
        cart[productInCardIndex].amount += 1;
        setCart([...cart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));

        return;
      }

      const productToAdd: Product = {
        ...productResponse.data,
        amount: 1,
      };
      const updatedCart = [...cart, productToAdd];
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
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

      if (!productInStock || !productInStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

   
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
        console.log("Amount", amount)
      console.log("Product Stock", productInStock.amount)
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
