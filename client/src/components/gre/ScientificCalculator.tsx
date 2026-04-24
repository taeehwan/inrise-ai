import { useState } from "react";
import { X } from "lucide-react";

interface ScientificCalculatorProps {
  onClose?: () => void;
}

export default function ScientificCalculator({ onClose }: ScientificCalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay((prev) => (prev === "0" ? num : prev + num));
    }
  };

  const handleOperator = (op: string) => {
    setExpression((prev) => prev + display + op);
    setIsNewNumber(true);
  };

  const handleEquals = () => {
    try {
      const fullExpr = expression + display;
      const sanitized = fullExpr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, Math.PI.toString())
        .replace(/e(?![x])/g, Math.E.toString());
      const result = Function('"use strict"; return (' + sanitized + ")")();
      setDisplay(String(Number(result.toFixed(10))));
      setExpression("");
      setIsNewNumber(true);
    } catch {
      setDisplay("Error");
      setExpression("");
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setExpression("");
    setIsNewNumber(true);
  };

  const handleFunction = (func: string) => {
    const num = parseFloat(display);
    let result: number;
    switch (func) {
      case "sin":
        result = Math.sin((num * Math.PI) / 180);
        break;
      case "cos":
        result = Math.cos((num * Math.PI) / 180);
        break;
      case "tan":
        result = Math.tan((num * Math.PI) / 180);
        break;
      case "sqrt":
        result = Math.sqrt(num);
        break;
      case "square":
        result = num * num;
        break;
      case "log":
        result = Math.log10(num);
        break;
      case "ln":
        result = Math.log(num);
        break;
      case "abs":
        result = Math.abs(num);
        break;
      case "1/x":
        result = 1 / num;
        break;
      case "percent":
        result = num / 100;
        break;
      case "negate":
        result = -num;
        break;
      default:
        result = num;
    }
    setDisplay(String(Number(result.toFixed(10))));
    setIsNewNumber(true);
  };

  const CalcButton = ({
    value,
    onClick,
    className = "",
    wide = false,
  }: {
    value: string;
    onClick: () => void;
    className?: string;
    wide?: boolean;
  }) => (
    <button onClick={onClick} className={`${wide ? "col-span-2" : ""} h-12 rounded-lg font-semibold text-lg transition-all active:scale-95 ${className}`}>
      {value}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-purple-800">Scientific Calculator</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="bg-gray-900 text-white p-4 rounded-lg mb-3">
        <div className="text-xs text-gray-400 h-4 overflow-hidden">{expression}</div>
        <div className="text-3xl font-mono text-right overflow-x-auto">{display}</div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <CalcButton value="sin" onClick={() => handleFunction("sin")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="cos" onClick={() => handleFunction("cos")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="tan" onClick={() => handleFunction("tan")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="√" onClick={() => handleFunction("sqrt")} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="x²" onClick={() => handleFunction("square")} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />

        <CalcButton value="log" onClick={() => handleFunction("log")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="ln" onClick={() => handleFunction("ln")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="π" onClick={() => handleNumber(Math.PI.toString())} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="e" onClick={() => handleNumber(Math.E.toString())} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="1/x" onClick={() => handleFunction("1/x")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />

        <CalcButton value="C" onClick={handleClear} className="bg-red-100 text-red-600 hover:bg-red-200" />
        <CalcButton value="±" onClick={() => handleFunction("negate")} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />
        <CalcButton value="%" onClick={() => handleFunction("percent")} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />
        <CalcButton value="÷" onClick={() => handleOperator("÷")} className="bg-violet-500 text-white hover:bg-violet-600" />
        <CalcButton value="(" onClick={() => handleNumber("(")} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />

        <CalcButton value="7" onClick={() => handleNumber("7")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="8" onClick={() => handleNumber("8")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="9" onClick={() => handleNumber("9")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="×" onClick={() => handleOperator("×")} className="bg-violet-500 text-white hover:bg-violet-600" />
        <CalcButton value=")" onClick={() => handleNumber(")")} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />

        <CalcButton value="4" onClick={() => handleNumber("4")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="5" onClick={() => handleNumber("5")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="6" onClick={() => handleNumber("6")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="-" onClick={() => handleOperator("-")} className="bg-violet-500 text-white hover:bg-violet-600" />
        <CalcButton value="^" onClick={() => handleOperator("**")} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />

        <CalcButton value="1" onClick={() => handleNumber("1")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="2" onClick={() => handleNumber("2")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="3" onClick={() => handleNumber("3")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="+" onClick={() => handleOperator("+")} className="bg-violet-500 text-white hover:bg-violet-600" />
        <CalcButton value="|x|" onClick={() => handleFunction("abs")} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />

        <CalcButton value="0" onClick={() => handleNumber("0")} className="bg-gray-100 hover:bg-gray-200" wide />
        <CalcButton value="." onClick={() => handleNumber(".")} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="=" onClick={handleEquals} className="bg-purple-600 text-white hover:bg-purple-700 col-span-2" wide />
      </div>
    </div>
  );
}
