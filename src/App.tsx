import { Header } from "./components/layout/Header";
import { Home } from "./pages/Home";

function App() {
  return (
    <div className="min-h-screen bg-[#140e0b] text-[#f1e8e0]">
      <Header />
      <Home />
    </div>
  );
}

export default App;