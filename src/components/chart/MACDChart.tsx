import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { StockData } from "../../types/stockTypes";
import CustomTooltip from "./CustomTooltip";

interface MACDChartProps {
  visibleData: StockData[];
  macdParams: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
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

const MACDChart: React.FC<MACDChartProps> = ({
  visibleData,
  macdParams,
  xAxisDomain,
  indicators,
}) => {
  if (!indicators.macd || visibleData.length === 0) return null;

  return (
    <div className="h-32 mb-6">
      <h3 className="text-sm font-medium mb-1">
        MACD ({macdParams.fastPeriod}, {macdParams.slowPeriod},{" "}
        {macdParams.signalPeriod})
      </h3>
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
          <YAxis tick={{ fontSize: 10 }} orientation="right" />
          <Tooltip content={<CustomTooltip indicators={indicators} />} />

          {/* ゼロライン */}
          <ReferenceLine y={0} stroke="#666" />

          {/* MACDヒストグラム */}
          <Bar
            dataKey="macdHistogram"
            fill="#888888"
            opacity={0.7}
            id={`volume-chart-${Date.now()}`}
          >
            {visibleData.map((entry, index) => (
              <Cell
                key={`volume-cell-${entry.date}-${index}`}
                fill={(entry.macdHistogram || 0) >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>

          {/* MACDライン */}
          <Line
            type="monotone"
            dataKey="macdLine"
            stroke="#2196F3"
            dot={false}
          />

          {/* シグナルライン */}
          <Line
            type="monotone"
            dataKey="signalLine"
            stroke="#FF5722"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MACDChart;
