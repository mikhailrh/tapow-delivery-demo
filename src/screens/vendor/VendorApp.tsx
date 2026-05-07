import { VendorNavProvider, useVendorNav } from "../../context/VendorNavContext";
import VendorMainScreen from "./VendorMainScreen";
import VendorHistoryScreen from "./VendorHistoryScreen";
import VendorStockScreen from "./VendorStockScreen";
import VendorOrderDetailScreen from "./VendorOrderDetailScreen";

function VendorRouter() {
  const { screen } = useVendorNav();
  switch (screen.name) {
    case "main":
      return <VendorMainScreen />;
    case "history":
      return <VendorHistoryScreen />;
    case "stock":
      return <VendorStockScreen />;
    case "orderDetail":
      return <VendorOrderDetailScreen orderId={screen.orderId} />;
  }
}

export default function VendorApp() {
  return (
    <VendorNavProvider>
      <VendorRouter />
    </VendorNavProvider>
  );
}
