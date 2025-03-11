import React from "react";
import { StockData } from "../../types/stockTypes";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  indicators: {
    ma20: boolean;
    ma50: boolean;
    ma75: boolean;
    ma100: boolean;
    ma200: boolean;
    bollingerBands: boolean;
    rsi: boolean;
    macd: boolean;
  };
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  indicators,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as StockData;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-bold text-gray-800">{data.formattedDate}</p>
        <div className="grid grid-cols-2 gap-x-4 mt-1">
          <p className="text-sm text-gray-600">
            始値: <span className="font-medium text-gray-800">{data.open}</span>
          </p>
          <p className="text-sm text-gray-600">
            終値:{" "}
            <span className="font-medium text-gray-800">{data.close}</span>
          </p>
          <p className="text-sm text-gray-600">
            高値: <span className="font-medium text-gray-800">{data.high}</span>
          </p>
          <p className="text-sm text-gray-600">
            安値: <span className="font-medium text-gray-800">{data.low}</span>
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          出来高:{" "}
          <span className="font-medium text-gray-800">
            {data.volume.toLocaleString()}
          </span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          売買代金:{" "}
          <span className="font-medium text-gray-800">
            {(data.turnoverValue / 1000000).toFixed(1)}M
          </span>
        </p>
        <p
          className={`text-sm font-medium mt-1 ${
            parseFloat(data.change) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          変化率: {data.change}%
        </p>

        {/* 移動平均線の値 */}
        {indicators.ma20 && data.ma20 && (
          <p className="text-sm text-gray-600">
            MA(20):{" "}
            <span className="font-medium" style={{ color: "#FF5722" }}>
              {data.ma20.toFixed(2)}
            </span>
          </p>
        )}
        {/* ... 他の移動平均線 ... */}

        {/* ボリンジャーバンドの値 */}
        {indicators.bollingerBands && data.bollingerUpper && (
          <>
            <p className="text-sm text-gray-600">
              BB上限:{" "}
              <span className="font-medium" style={{ color: "#9C27B0" }}>
                {data.bollingerUpper.toFixed(2)}
              </span>
            </p>
            {/* ... 他のボリンジャーバンド値 ... */}
          </>
        )}

        {/* RSI値 */}
        {indicators.rsi && data.rsi !== null && (
          <p
            className={`text-sm font-medium ${
              (data.rsi as number) > 70
                ? "text-red-600"
                : (data.rsi as number) < 30
                ? "text-green-600"
                : "text-gray-600"
            }`}
          >
            RSI: {(data.rsi as number).toFixed(2)}
          </p>
        )}

        {/* MACD値 */}
        {indicators.macd &&
          data.macdLine !== null &&
          data.signalLine !== null && (
            <>
              <p className="text-sm text-gray-600">
                MACD:{" "}
                <span className="font-medium" style={{ color: "#2196F3" }}>
                  {(data.macdLine as number).toFixed(2)}
                </span>
              </p>
              {/* ... 他のMACD値 ... */}
            </>
          )}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
