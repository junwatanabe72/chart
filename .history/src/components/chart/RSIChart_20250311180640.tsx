import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ReferenceLine,
} from "recharts";
import { StockData } from "../../types/stockTypes";
import CustomTooltip from "./CustomTooltip";

interface RSIChartProps {
  visibleData: StockData[];
  rsiPeriod: number;
  xAxisDomain: [number, number] | null;
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

const RSIChart: React.FC<RSIChartProps> = ({
  visibleData,
  rsiPeriod,
  xAxisDomain,
  indicators,
}) => {
  if (!indicators.rsi || visibleData.length === 0) return null;

  return (
    <div className="h-32 mb-6">
      <h3 className="text-sm font-medium mb-1">RSI ({rsiPeriod})</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={visibleData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 10 }}
            height={10}
            domain={xAxisDomain || ["auto", "auto"]}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            orientation="right"
            ticks={[0, 30, 50, 70, 100]}
          />
          <Tooltip content={<CustomTooltip indicators={indicators} />} />

          {/* 買われすぎライン (70) */}
          <ReferenceLine y={70} stroke="red" strokeDasharray="3 3" />

          {/* 中立ライン (50) */}
          <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />

          {/* 売られすぎライン (30) */}
          <ReferenceLine y={30} stroke="green" strokeDasharray="3 3" />

          <Line
            type="monotone"
            dataKey="rsi"
            stroke="#FF9800"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RSIChart;
