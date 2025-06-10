import GridController from "./components/GridController";
import './index.css';
// import AnimatedGrid from './components/AnimatedGrid';

function App() {
  return (
    <div className="h-screen bg-gray-100">
      {/* <AnimatedGrid structure={[
        { height: 2, columns: [1, 2, 1] },
        { height: 1, columns: [1, 1] }
      ]} /> */}
      <GridController />
    </div>
  );
}

export default App;
