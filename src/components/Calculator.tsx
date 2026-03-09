import { useState } from "react";

const buttons = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
];

const Calculator = () => {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const handleClick = (val: string) => {
    if (val >= "0" && val <= "9" || val === ".") {
      if (reset || display === "0" && val !== ".") {
        setDisplay(val);
        setReset(false);
      } else {
        if (val === "." && display.includes(".")) return;
        setDisplay(display + val);
      }
    } else if (val === "C") {
      setDisplay("0");
      setPrev(null);
      setOp(null);
    } else if (val === "±") {
      setDisplay(String(-parseFloat(display)));
    } else if (val === "%") {
      setDisplay(String(parseFloat(display) / 100));
    } else if (val === "=") {
      if (prev !== null && op) {
        setDisplay(String(calc(prev, parseFloat(display), op)));
        setPrev(null);
        setOp(null);
        setReset(true);
      }
    } else {
      if (prev !== null && op && !reset) {
        const result = calc(prev, parseFloat(display), op);
        setPrev(result);
        setDisplay(String(result));
      } else {
        setPrev(parseFloat(display));
      }
      setOp(val);
      setReset(true);
    }
  };

  const calc = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const isOp = (val: string) => ["÷", "×", "−", "+"].includes(val);
  const isActive = (val: string) => op === val && reset;

  const formatDisplay = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "0";
    if (val.endsWith(".") || val.endsWith(".0")) return val;
    if (Math.abs(num) > 999999999) return num.toExponential(4);
    return val.length > 12 ? num.toPrecision(10) : val;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-80 bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Display */}
        <div className="px-6 pt-8 pb-4 text-right">
          <div className="text-muted-foreground text-sm h-6 truncate">
            {prev !== null && op ? `${prev} ${op}` : ""}
          </div>
          <div className="text-foreground text-5xl font-bold tracking-tight truncate">
            {formatDisplay(display)}
          </div>
        </div>

        {/* Buttons */}
        <div className="p-3 flex flex-col gap-2">
          {buttons.map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleClick(btn)}
                  className={`
                    h-16 rounded-xl text-xl font-medium transition-all duration-150 active:scale-95
                    ${btn === "0" ? "flex-[2]" : "flex-1"}
                    ${isOp(btn)
                      ? isActive(btn)
                        ? "bg-foreground text-background"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                      : btn === "C" || btn === "±" || btn === "%"
                        ? "bg-secondary text-secondary-foreground hover:brightness-125"
                        : "bg-muted text-foreground hover:brightness-125"
                    }
                    ${btn === "=" ? "bg-primary text-primary-foreground hover:brightness-110" : ""}
                  `}
                >
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calculator;
