import React from "react";
import { ChartStyleType, TechnicalIndicators } from "../types/stockTypes";

interface ChartSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // チャートスタイル設定
  chartStyle: ChartStyleType;
  setChartStyle: (style: ChartStyleType) => void;
  // 描画ツール設定
  drawingMode: "trendline" | "horizontalline" | null;
  toggleDrawingMode: (mode: "trendline" | "horizontalline" | null) => void;
  drawingLines: any[];
  setDrawingLines: (lines: any[]) => void;
  showCrosshair: boolean;
  toggleCrosshair: () => void;
  // テクニカル指標設定
  indicators: TechnicalIndicators;
  toggleIndicator: (indicator: keyof TechnicalIndicators) => void;
  bollingerPeriod: number;
  setBollingerPeriod: (period: number) => void;
  bollingerStdDev: number;
  setBollingerStdDev: (stdDev: number) => void;
  rsiPeriod: number;
  setRsiPeriod: (period: number) => void;
  macdParams: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  setMacdParams: (params: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  }) => void;
  // その他の設定
  resetZoom: () => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
}

const ChartSettingsDrawer: React.FC<ChartSettingsDrawerProps> = ({
  isOpen,
  onClose,
  chartStyle,
  setChartStyle,
  drawingMode,
  toggleDrawingMode,
  drawingLines,
  setDrawingLines,
  showCrosshair,
  toggleCrosshair,
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
  resetZoom,
  setShowKeyboardShortcuts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* ドロワー本体 */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">チャート設定</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* 操作方法 */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">操作方法</h3>
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">マウスホイール</span>: ズーム
              </p>
              <p>
                <span className="font-medium">ドラッグ</span>: 移動
              </p>
              <div className="mt-2 flex space-x-2">
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
          </div>

          {/* チャートスタイル */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">チャートスタイル</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChartStyle("candlestick")}
                className={`px-3 py-2 text-sm rounded ${
                  chartStyle === "candlestick"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                ローソク足
              </button>
              <button
                onClick={() => setChartStyle("ohlc")}
                className={`px-3 py-2 text-sm rounded ${
                  chartStyle === "ohlc"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                OHLC
              </button>
              <button
                onClick={() => setChartStyle("line")}
                className={`px-3 py-2 text-sm rounded ${
                  chartStyle === "line"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                ライン
              </button>
              <button
                onClick={() => setChartStyle("area")}
                className={`px-3 py-2 text-sm rounded ${
                  chartStyle === "area"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                エリア
              </button>
            </div>
          </div>

          {/* 描画ツール */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">描画ツール</h3>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleDrawingMode("trendline")}
                  className={`flex-1 px-3 py-2 text-sm rounded ${
                    drawingMode === "trendline"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  トレンドライン
                </button>
                <button
                  onClick={() => toggleDrawingMode("horizontalline")}
                  className={`flex-1 px-3 py-2 text-sm rounded ${
                    drawingMode === "horizontalline"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  水平線
                </button>
              </div>
              {drawingLines.length > 0 && (
                <button
                  onClick={() => setDrawingLines([])}
                  className="w-full px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
                >
                  すべての線を削除
                </button>
              )}
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="crosshair-toggle"
                  checked={showCrosshair}
                  onChange={toggleCrosshair}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <label htmlFor="crosshair-toggle" className="ml-2 text-sm">
                  十字カーソル表示
                </label>
              </div>
            </div>
          </div>

          {/* テクニカル指標 */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">テクニカル指標</h3>

            {/* 移動平均線 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">移動平均線</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={indicators.ma20}
                    onChange={() => toggleIndicator("ma20")}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm" style={{ color: "#FF5722" }}>
                    MA(20)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={indicators.ma50}
                    onChange={() => toggleIndicator("ma50")}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm" style={{ color: "#2196F3" }}>
                    MA(50)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={indicators.ma75}
                    onChange={() => toggleIndicator("ma75")}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm" style={{ color: "#4CAF50" }}>
                    MA(75)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={indicators.ma100}
                    onChange={() => toggleIndicator("ma100")}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm" style={{ color: "#9C27B0" }}>
                    MA(100)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={indicators.ma200}
                    onChange={() => toggleIndicator("ma200")}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm" style={{ color: "#E91E63" }}>
                    MA(200)
                  </span>
                </label>
              </div>
            </div>

            {/* ボリンジャーバンド */}
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="bollinger-toggle"
                  checked={indicators.bollingerBands}
                  onChange={() => toggleIndicator("bollingerBands")}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="bollinger-toggle"
                  className="ml-2 text-sm font-medium"
                >
                  ボリンジャーバンド
                </label>
              </div>

              {indicators.bollingerBands && (
                <div className="ml-6 space-y-2 mt-2">
                  <div className="flex items-center">
                    <span className="text-sm w-20">期間:</span>
                    <select
                      value={bollingerPeriod}
                      onChange={(e) =>
                        setBollingerPeriod(Number(e.target.value))
                      }
                      className="form-select text-sm border border-gray-300 rounded p-1"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm w-20">標準偏差:</span>
                    <select
                      value={bollingerStdDev}
                      onChange={(e) =>
                        setBollingerStdDev(Number(e.target.value))
                      }
                      className="form-select text-sm border border-gray-300 rounded p-1"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="2.5">2.5</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* RSI */}
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="rsi-toggle"
                  checked={indicators.rsi}
                  onChange={() => toggleIndicator("rsi")}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="rsi-toggle"
                  className="ml-2 text-sm font-medium"
                >
                  RSI
                </label>
              </div>

              {indicators.rsi && (
                <div className="ml-6 mt-2">
                  <div className="flex items-center">
                    <span className="text-sm w-20">期間:</span>
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
                </div>
              )}
            </div>

            {/* MACD */}
            <div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="macd-toggle"
                  checked={indicators.macd}
                  onChange={() => toggleIndicator("macd")}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <label
                  htmlFor="macd-toggle"
                  className="ml-2 text-sm font-medium"
                >
                  MACD
                </label>
              </div>

              {indicators.macd && (
                <div className="ml-6 space-y-2 mt-2">
                  <div className="flex items-center">
                    <span className="text-sm w-20">Fast:</span>
                    <select
                      value={macdParams.fastPeriod}
                      onChange={(e) =>
                        setMacdParams({
                          ...macdParams,
                          fastPeriod: Number(e.target.value),
                        })
                      }
                      className="form-select text-sm border border-gray-300 rounded p-1 w-16"
                    >
                      <option value="8">8</option>
                      <option value="12">12</option>
                      <option value="16">16</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm w-20">Slow:</span>
                    <select
                      value={macdParams.slowPeriod}
                      onChange={(e) =>
                        setMacdParams({
                          ...macdParams,
                          slowPeriod: Number(e.target.value),
                        })
                      }
                      className="form-select text-sm border border-gray-300 rounded p-1 w-16"
                    >
                      <option value="21">21</option>
                      <option value="26">26</option>
                      <option value="30">30</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm w-20">Signal:</span>
                    <select
                      value={macdParams.signalPeriod}
                      onChange={(e) =>
                        setMacdParams({
                          ...macdParams,
                          signalPeriod: Number(e.target.value),
                        })
                      }
                      className="form-select text-sm border border-gray-300 rounded p-1 w-16"
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
        </div>
      </div>
    </div>
  );
};

export default ChartSettingsDrawer;
