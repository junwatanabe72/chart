import React, { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Brush,
  Line,
  Legend,
  Area,
} from "recharts";

// 型とフックのインポート
import { StockStats } from "../types/stockTypes";
import { useStockData } from "../hooks/useStockData";
import { useChartInteraction } from "../hooks/useChartInteraction";

// サブコンポーネントのインポート
import CustomTooltip from "./chart/CustomTooltip";
import {
  renderCandlestick,
  renderOHLC,
  CustomCursor,
} from "./chart/ChartRenderers";
import RSIChart from "./chart/RSIChart";
import MACDChart from "./chart/MACDChart";
import KeyboardShortcutsHelp from "./chart/KeyboardShortcutsHelp";

// StockInfoコンポーネントから必要な部分をインポート
import StockInfo from "./StockInfo";

// 会社情報と財務データの型定義を追加
interface CompanyInfo {
  Code: string;
  CompanyName: string;
  CompanyNameEnglish: string;
  Sector33CodeName: string;
  MarketCodeName: string;
}

interface FinancialStatement {
  DisclosedDate: string;
  TypeOfDocument: string;
  TypeOfCurrentPeriod: string;
  NetSales: string;
  OperatingProfit: string;
  OrdinaryProfit: string;
  Profit: string;
  EarningsPerShare: string;
}

const StockChart: React.FC = () => {
  // カスタムフックを使用してデータとチャート操作を管理
  const {
    stockData,
    visibleData,
    loading,
    error,
    setXAxisDomain,
    updateVisibleData,
    xAxisDomain,
    indicators,
    toggleIndicator,
    bollingerPeriod,
    setBollingerPeriod,
    bollingerStdDev,
    setBollingerStdDev,
    rsiPeriod,
    setRsiPeriod,
    macdParams,
    setMacdParams,
  } = useStockData();

  const {
    showCrosshair,
    toggleCrosshair,
    crosshairValues,

    drawingMode,
    toggleDrawingMode,
    drawingLines,
    setDrawingLines,
    drawingStart,
    drawingEnd,
    selectedLine,
    setSelectedLine,

    chartStyle,
    setChartStyle,
    showKeyboardShortcuts,
    setShowKeyboardShortcuts,
    chartRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    deleteLine,
  } = useChartInteraction({
    stockData,
    updateVisibleData,
    setXAxisDomain,
    xAxisDomain,
  });

  // 統計情報を計算
  const getStats = (): StockStats => {
    if (visibleData.length === 0) return { high: 0, low: 0, avg: "0" };

    const high = Math.max(...visibleData.map((item) => item.high));
    const low = Math.min(...visibleData.map((item) => item.low));
    const avg =
      visibleData.reduce((sum, item) => sum + item.close, 0) /
      visibleData.length;

    return { high, low, avg: avg.toFixed(2) };
  };

  const stats = getStats();

  // ドメイン（Y軸の範囲）を計算
  const calculateDomain = (): [number, number] => {
    let minPrice = Math.min(...visibleData.map((item) => item.low));
    let maxPrice = Math.max(...visibleData.map((item) => item.high));

    // テクニカル指標の値も考慮
    if (indicators.ma20) {
      const ma20Values = visibleData
        .filter((d) => d.ma20 !== null)
        .map((d) => d.ma20 as number);
      if (ma20Values.length > 0) {
        minPrice = Math.min(minPrice, ...ma20Values);
        maxPrice = Math.max(maxPrice, ...ma20Values);
      }
    }

    // 他の移動平均線も同様に処理...

    // ボリンジャーバンドの値も考慮
    if (indicators.bollingerBands) {
      const upperValues = visibleData
        .filter((d) => d.bollingerUpper !== null)
        .map((d) => d.bollingerUpper as number);
      const lowerValues = visibleData
        .filter((d) => d.bollingerLower !== null)
        .map((d) => d.bollingerLower as number);

      if (upperValues.length > 0) {
        maxPrice = Math.max(maxPrice, ...upperValues);
      }

      if (lowerValues.length > 0) {
        minPrice = Math.min(minPrice, ...lowerValues);
      }
    }

    // パディングを追加
    const padding = (maxPrice - minPrice) * 0.05;
    return [minPrice - padding, maxPrice + padding];
  };

  const domain = calculateDomain();

  // 描画線のレンダリング
  const renderDrawingLines = () => {
    const allLines = [...drawingLines];

    // 描画モード中なら、現在の描画線も追加
    if (drawingMode && drawingStart && drawingEnd) {
      allLines.push({
        id: "current-drawing",
        type: drawingMode,
        startIndex: drawingStart.index,
        startPrice: drawingStart.price,
        endIndex: drawingEnd.index,
        endPrice: drawingEnd.price,
        color: "#FF9800",
      });
    }

    return allLines.map((line) => {
      // インデックスをX座標に変換
      const startX =
        ((line.startIndex - (xAxisDomain ? xAxisDomain[0] : 0)) /
          ((xAxisDomain ? xAxisDomain[1] : stockData.length - 1) -
            (xAxisDomain ? xAxisDomain[0] : 0))) *
        100;
      const endX =
        ((line.endIndex - (xAxisDomain ? xAxisDomain[0] : 0)) /
          ((xAxisDomain ? xAxisDomain[1] : stockData.length - 1) -
            (xAxisDomain ? xAxisDomain[0] : 0))) *
        100;

      // 価格をY座標に変換（反転）
      const [minPrice, maxPrice] = domain;
      const priceRange = maxPrice - minPrice;
      const startY = ((maxPrice - line.startPrice) / priceRange) * 100;
      const endY = ((maxPrice - line.endPrice) / priceRange) * 100;

      const isSelected = selectedLine === line.id;

      return (
        <g key={line.id} onClick={() => setSelectedLine(line.id)}>
          <line
            x1={`${startX}%`}
            y1={`${startY}%`}
            x2={`${endX}%`}
            y2={`${endY}%`}
            stroke={line.color}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isSelected ? "none" : "none"}
            pointerEvents="all"
            style={{ cursor: "pointer" }}
          />
          {/* 選択された線のハンドルを描画 */}
          {isSelected && (
            <>
              <circle
                cx={`${startX}%`}
                cy={`${startY}%`}
                r={4}
                fill={line.color}
              />
              <circle cx={`${endX}%`} cy={`${endY}%`} r={4} fill={line.color} />
              {/* 削除ボタン */}
              <g
                transform={`translate(${(startX + endX) / 2}%, ${
                  (startY + endY) / 2
                }%)`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLine(line.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x="-10"
                  y="-10"
                  width="20"
                  height="20"
                  fill="white"
                  opacity="0.8"
                  rx="2"
                />
                <text x="0" y="4" textAnchor="middle" fill="red" fontSize="14">
                  ×
                </text>
              </g>
            </>
          )}
        </g>
      );
    });
  };

  // メインチャートコンポーネント
  const MainChart = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={visibleData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 10 }}
            domain={xAxisDomain || ["auto", "auto"]}
          />
          <YAxis domain={domain} tick={{ fontSize: 10 }} orientation="right" />
          <Tooltip
            content={<CustomTooltip indicators={indicators} />}
            cursor={
              showCrosshair ? (
                <CustomCursor
                  showCrosshair={showCrosshair}
                  crosshairValues={crosshairValues}
                />
              ) : (
                false
              )
            }
          />

          {/* ボリンジャーバンド */}
          {indicators.bollingerBands && (
            <>
              <Area
                type="monotone"
                dataKey="bollingerUpper"
                stroke="#9C27B0"
                strokeDasharray="3 3"
                fill="#9C27B0"
                fillOpacity={0.05}
                dot={false}
                activeDot={false}
                name="BB上限"
              />
              <Line
                type="monotone"
                dataKey="bollingerMiddle"
                stroke="#9C27B0"
                dot={false}
                activeDot={false}
                name="BB中央"
              />
              <Area
                type="monotone"
                dataKey="bollingerLower"
                stroke="#9C27B0"
                strokeDasharray="3 3"
                fill="transparent"
                dot={false}
                activeDot={false}
                name="BB下限"
              />
            </>
          )}

          {/* 移動平均線 */}
          {indicators.ma20 && (
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#FF5722"
              dot={false}
              strokeWidth={1.5}
              name="MA(20)"
            />
          )}
          {indicators.ma50 && (
            <Line
              type="monotone"
              dataKey="ma50"
              stroke="#2196F3"
              dot={false}
              strokeWidth={1.5}
              name="MA(50)"
            />
          )}
          {indicators.ma75 && (
            <Line
              type="monotone"
              dataKey="ma75"
              stroke="#4CAF50"
              dot={false}
              strokeWidth={1.5}
              name="MA(75)"
            />
          )}
          {indicators.ma100 && (
            <Line
              type="monotone"
              dataKey="ma100"
              stroke="#9C27B0"
              dot={false}
              strokeWidth={1.5}
              name="MA(100)"
            />
          )}
          {indicators.ma200 && (
            <Line
              type="monotone"
              dataKey="ma200"
              stroke="#E91E63"
              dot={false}
              strokeWidth={1.5}
              name="MA(200)"
            />
          )}

          {/* チャートスタイルに応じたレンダリング */}
          {chartStyle === "candlestick" && (
            <Bar
              dataKey="high"
              shape={(props) =>
                renderCandlestick({ ...props, visibleData, stockData })
              }
              isAnimationActive={false}
              id={`volume-chart-${Date.now()}`}
            />
          )}

          {chartStyle === "ohlc" && (
            <Bar
              dataKey="high"
              shape={(props) =>
                renderOHLC({ ...props, visibleData, stockData })
              }
              isAnimationActive={false}
              id={`volume-chart-${Date.now()}`}
            />
          )}

          {chartStyle === "line" && (
            <Line
              type="monotone"
              dataKey="close"
              stroke="#4F46E5"
              dot={false}
              strokeWidth={2}
              name="終値"
            />
          )}

          {chartStyle === "area" && (
            <Area
              type="monotone"
              dataKey="close"
              stroke="#4F46E5"
              fill="#4F46E5"
              fillOpacity={0.1}
              dot={false}
              name="終値"
            />
          )}

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => (
              <span style={{ fontSize: "0.75rem" }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // 出来高チャート
  const VolumeChart = () => {
    return (
      <div className="h-32 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 10 }}
              domain={xAxisDomain || ["auto", "auto"]}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              orientation="right"
              tickFormatter={(tick: number): string =>
                (tick / 1000000).toFixed(1) + "M"
              }
            />
            <Tooltip content={<CustomTooltip indicators={indicators} />} />
            <Bar
              dataKey="volume"
              name="出来高"
              id={`volume-chart-${Date.now()}`}
            >
              {visibleData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close >= entry.open ? "#22c55e" : "#ef4444"}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ナビゲーションミニマップ
  const NavigationMinimap = () => {
    return (
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stockData}
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="formattedDate"
              height={0}
              tick={false}
              axisLine={false}
            />
            <Brush
              dataKey="formattedDate"
              height={20}
              stroke="#4F46E5"
              startIndex={xAxisDomain ? Math.floor(xAxisDomain[0]) : 0}
              endIndex={
                xAxisDomain ? Math.ceil(xAxisDomain[1]) : stockData.length - 1
              }
              onChange={(brushData) => {
                if (
                  brushData.startIndex !== undefined &&
                  brushData.endIndex !== undefined
                ) {
                  setXAxisDomain([brushData.startIndex, brushData.endIndex]);
                  updateVisibleData(brushData.startIndex, brushData.endIndex);
                }
              }}
            />
            <Bar
              dataKey="volume"
              fill="#CBD5E1"
              fillOpacity={0.5}
              id={`volume-chart-${Date.now()}`}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // 会社情報と財務データの状態を追加
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [financialData, setFinancialData] = useState<FinancialStatement[]>([]);
  const [showFinancials, setShowFinancials] = useState(false);

  // 会社情報と財務データを取得するuseEffect
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        // 会社情報を取得
        const response = await fetch("/specifiedStockList.json");
        if (!response.ok) {
          throw new Error("会社情報の取得に失敗しました");
        }
        const data = await response.json();

        // データ構造を確認して適切に処理
        let company = null;

        if (Array.isArray(data)) {
          // データが配列の場合
          company = data.find((stock: any) => stock.Code === "130A0");
        } else if (data.stocks && Array.isArray(data.stocks)) {
          // data.stocksが配列の場合
          company = data.stocks.find((stock: any) => stock.Code === "130A0");
        } else {
          // その他の構造の場合
          console.error("Unexpected data structure:", data);
          throw new Error("データ構造が予期しない形式です");
        }

        if (company) {
          setCompanyInfo(company);
        } else {
          throw new Error("指定された会社が見つかりません");
        }

        // 財務データを取得
        const financialResponse = await fetch(
          "/specifiedStockFinancialData/130A0.json"
        );
        if (!financialResponse.ok) {
          throw new Error("財務データの取得に失敗しました");
        }
        const financialData = await financialResponse.json();

        // 財務データを日付順にソート
        const sortedStatements = financialData.statements.sort(
          (a: any, b: any) =>
            new Date(b.DisclosedDate).getTime() -
            new Date(a.DisclosedDate).getTime()
        );

        setFinancialData(sortedStatements);
      } catch (err) {
        console.error("データ取得エラー:", err);
      }
    };

    fetchCompanyInfo();
  }, []);

  // 金額をフォーマットする関数
  const formatAmount = (amount: string) => {
    if (!amount) return "-";
    const num = parseInt(amount, 10);
    if (isNaN(num)) return "-";

    // 百万円単位で表示
    return `${(num / 1000000).toFixed(2)}百万円`;
  };

  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 財務書類の種類を日本語に変換
  const getDocumentTypeJP = (type: string) => {
    const types: { [key: string]: string } = {
      FYFinancialStatements_NonConsolidated_JP: "通期決算",
      "1QFinancialStatements_NonConsolidated_JP": "第1四半期決算",
      "2QFinancialStatements_NonConsolidated_JP": "第2四半期決算",
      "3QFinancialStatements_NonConsolidated_JP": "第3四半期決算",
      EarnForecastRevision: "業績予想修正",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        {error}
      </div>
    );
  }

  if (stockData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        データがありません
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <StockInfo />
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <p>
            操作方法: <span className="font-medium">マウスホイール</span>
            でズーム、<span className="font-medium">ドラッグ</span>で移動
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm flex items-center"
          >
            <span className="mr-1">⌨️</span>
            <span>ショートカット</span>
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
          >
            全体表示に戻す
          </button>
        </div>
      </div>

      {/* チャートスタイル切替コントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">チャートスタイル:</span>
          <button
            onClick={() => setChartStyle("candlestick")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "candlestick"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            ローソク足
          </button>
          <button
            onClick={() => setChartStyle("ohlc")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "ohlc"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            OHLC
          </button>
          <button
            onClick={() => setChartStyle("line")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "line"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            ライン
          </button>
          <button
            onClick={() => setChartStyle("area")}
            className={`px-3 py-1 text-sm rounded ${
              chartStyle === "area"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            エリア
          </button>
        </div>
      </div>

      {/* 描画ツールコントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium">描画ツール:</span>
          <button
            onClick={() => toggleDrawingMode("trendline")}
            className={`px-3 py-1 text-sm rounded ${
              drawingMode === "trendline"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            トレンドライン
          </button>
          <button
            onClick={() => toggleDrawingMode("horizontalline")}
            className={`px-3 py-1 text-sm rounded ${
              drawingMode === "horizontalline"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            水平線
          </button>
          {drawingLines.length > 0 && (
            <button
              onClick={() => setDrawingLines([])}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
            >
              すべて削除
            </button>
          )}

          {/* クロスヘアー切替 */}
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={showCrosshair}
              onChange={toggleCrosshair}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm">十字カーソル</span>
          </label>
        </div>
      </div>

      {/* テクニカル指標の切替コントロール */}
      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="text-sm font-medium">移動平均線:</span>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma20}
              onChange={() => toggleIndicator("ma20")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#FF5722" }}>
              MA(20)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma50}
              onChange={() => toggleIndicator("ma50")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#2196F3" }}>
              MA(50)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma75}
              onChange={() => toggleIndicator("ma75")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#4CAF50" }}>
              MA(75)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma100}
              onChange={() => toggleIndicator("ma100")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#9C27B0" }}>
              MA(100)
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.ma200}
              onChange={() => toggleIndicator("ma200")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm" style={{ color: "#E91E63" }}>
              MA(200)
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.bollingerBands}
              onChange={() => toggleIndicator("bollingerBands")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">ボリンジャーバンド</span>
          </label>

          {indicators.bollingerBands && (
            <>
              <div className="flex items-center ml-4">
                <span className="text-sm mr-2">期間:</span>
                <select
                  value={bollingerPeriod}
                  onChange={(e) => setBollingerPeriod(Number(e.target.value))}
                  className="form-select text-sm border border-gray-300 rounded p-1"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-2">標準偏差:</span>
                <select
                  value={bollingerStdDev}
                  onChange={(e) => setBollingerStdDev(Number(e.target.value))}
                  className="form-select text-sm border border-gray-300 rounded p-1"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="2.5">2.5</option>
                  <option value="3">3</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* RSIコントロール */}
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={indicators.rsi}
              onChange={() => toggleIndicator("rsi")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">RSI</span>
          </label>

          {indicators.rsi && (
            <div className="flex items-center ml-2">
              <span className="text-sm mr-2">期間:</span>
              <select
                value={rsiPeriod}
                onChange={(e) => setRsiPeriod(Number(e.target.value))}
                className="form-select text-sm border border-gray-300 rounded p-1"
              >
                <option value="5">5</option>
                <option value="9">9</option>
                <option value="14">14</option>
                <option value="21">21</option>
              </select>
            </div>
          )}

          {/* MACDコントロール */}
          <label className="inline-flex items-center ml-4">
            <input
              type="checkbox"
              checked={indicators.macd}
              onChange={() => toggleIndicator("macd")}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-1 text-sm font-medium">MACD</span>
          </label>

          {indicators.macd && (
            <div className="flex items-center ml-2 space-x-2">
              <div className="flex items-center">
                <span className="text-sm mr-1">Fast:</span>
                <select
                  value={macdParams.fastPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      fastPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-1">Slow:</span>
                <select
                  value={macdParams.slowPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      slowPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="21">21</option>
                  <option value="26">26</option>
                  <option value="30">30</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-1">Signal:</span>
                <select
                  value={macdParams.signalPeriod}
                  onChange={(e) =>
                    setMacdParams({
                      ...macdParams,
                      signalPeriod: Number(e.target.value),
                    })
                  }
                  className="form-select text-sm border border-gray-300 rounded p-1 w-12"
                >
                  <option value="7">7</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">最高値</p>
          <p className="text-lg font-bold">{stats.high}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">最安値</p>
          <p className="text-lg font-bold">{stats.low}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm text-gray-600">平均値</p>
          <p className="text-lg font-bold">{stats.avg}</p>
        </div>
      </div>

      {/* メインチャート */}
      <div
        className="h-64 mb-6 cursor-grab active:cursor-grabbing relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={chartRef}
        tabIndex={0}
      >
        <MainChart />
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ overflow: "visible" }}
        >
          {renderDrawingLines()}
        </svg>
      </div>

      {/* 出来高チャート */}
      <VolumeChart />

      {/* RSIとMACDチャート */}
      <RSIChart
        visibleData={visibleData}
        rsiPeriod={rsiPeriod}
        xAxisDomain={xAxisDomain}
        indicators={indicators}
      />

      <MACDChart
        visibleData={visibleData}
        macdParams={macdParams}
        xAxisDomain={xAxisDomain}
        indicators={indicators}
      />

      {/* ナビゲーションミニマップ */}
      <NavigationMinimap />

      {/* 最新価格情報 */}
      {stockData.length > 0 && (
        <div className="mt-6 p-4 border border-gray-200 rounded">
          <h3 className="font-bold">
            最新価格情報 ({stockData[stockData.length - 1].formattedDate})
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">始値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].open}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">終値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].close}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">高値</p>
              <p className="font-bold">
                {stockData[stockData.length - 1].high}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">安値</p>
              <p className="font-bold">{stockData[stockData.length - 1].low}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>
          凡例：{" "}
          <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>{" "}
          陽線（上昇）/{" "}
          <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>{" "}
          陰線（下降）
        </p>
      </div>

      {/* キーボードショートカットヘルプ */}
      {showKeyboardShortcuts && (
        <KeyboardShortcutsHelp
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {/* 会社情報セクション */}
      {companyInfo && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">{companyInfo.CompanyName}</h2>
          <p className="text-gray-600 mb-1">{companyInfo.CompanyNameEnglish}</p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">証券コード</p>
              <p className="font-medium">{companyInfo.Code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">業種</p>
              <p className="font-medium">{companyInfo.Sector33CodeName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">市場</p>
              <p className="font-medium">{companyInfo.MarketCodeName}</p>
            </div>
          </div>

          <button
            onClick={() => setShowFinancials(!showFinancials)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showFinancials ? "業績を隠す" : "業績を表示"}
          </button>
        </div>
      )}

      {/* 業績表示セクション */}
      {showFinancials && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-xl font-bold mb-4">業績推移</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 border text-left">開示日</th>
                  <th className="py-2 px-3 border text-left">種類</th>
                  <th className="py-2 px-3 border text-right">売上高</th>
                  <th className="py-2 px-3 border text-right">営業利益</th>
                  <th className="py-2 px-3 border text-right">経常利益</th>
                  <th className="py-2 px-3 border text-right">当期純利益</th>
                  <th className="py-2 px-3 border text-right">EPS</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((statement, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="py-2 px-3 border">
                      {formatDate(statement.DisclosedDate)}
                    </td>
                    <td className="py-2 px-3 border">
                      {getDocumentTypeJP(statement.TypeOfDocument)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.NetSales)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.OperatingProfit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.OrdinaryProfit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {formatAmount(statement.Profit)}
                    </td>
                    <td className="py-2 px-3 border text-right">
                      {statement.EarningsPerShare || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockChart;
