import PhoneFrame from "./components/PhoneFrame";
import DemoControls from "./components/DemoControls";
import { CartProvider } from "./context/CartContext";
import { NavProvider, useNav } from "./context/NavContext";
import { OrdersProvider } from "./context/OrdersContext";
import { StoreProvider } from "./context/StoreContext";
import { StockProvider } from "./context/StockContext";
import { PromoProvider } from "./context/PromoContext";
import { VenueProvider } from "./context/VenueContext";
import { VenueProfileProvider } from "./context/VenueProfileContext";
import { CustomerProfileProvider } from "./context/CustomerProfileContext";
import { ClosedDaysProvider } from "./context/ClosedDaysContext";
import {
  PerspectiveProvider,
  usePerspective,
} from "./context/PerspectiveContext";
import CartScreen from "./screens/CartScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen";
import ItemScreen from "./screens/ItemScreen";
import MenuScreen from "./screens/MenuScreen";
import WhatsAppScreen from "./screens/WhatsAppScreen";
import VendorApp from "./screens/vendor/VendorApp";
import ManagerApp from "./screens/manager/ManagerApp";

function CustomerScreen() {
  const { screen } = useNav();
  switch (screen.name) {
    case "menu":
      return <MenuScreen jumpTo={screen.jumpTo} />;
    case "item":
      return <ItemScreen itemId={screen.itemId} />;
    case "cart":
      return <CartScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "confirmation":
      return <ConfirmationScreen orderId={screen.orderId} />;
    case "whatsapp":
      return <WhatsAppScreen orderId={screen.orderId} />;
  }
}

function CustomerApp() {
  return (
    <CartProvider>
      <NavProvider>
        <CustomerScreen />
      </NavProvider>
    </CartProvider>
  );
}

function PerspectiveRoot() {
  const { perspective } = usePerspective();
  // Vendor (kitchen) → tablet frame; Customer + Manager → phone frame.
  const variant = perspective === "vendor" ? "tablet" : "phone";
  return (
    <PhoneFrame variant={variant}>
      {perspective === "vendor" ? (
        <VendorApp />
      ) : perspective === "manager" ? (
        <ManagerApp />
      ) : (
        <CustomerApp />
      )}
    </PhoneFrame>
  );
}

export default function App() {
  return (
    <VenueProvider>
      <PerspectiveProvider>
        <OrdersProvider>
          <StoreProvider>
            <StockProvider>
              <PromoProvider>
                <VenueProfileProvider>
                  <CustomerProfileProvider>
                    <ClosedDaysProvider>
                      <PerspectiveRoot />
                      <DemoControls />
                    </ClosedDaysProvider>
                  </CustomerProfileProvider>
                </VenueProfileProvider>
              </PromoProvider>
            </StockProvider>
          </StoreProvider>
        </OrdersProvider>
      </PerspectiveProvider>
    </VenueProvider>
  );
}
