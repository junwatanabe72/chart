import React, { useState } from "react";

const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const onClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`fixed inset-0 ${isOpen ? "block" : "hidden"}`}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg">
          <div>十字カーソル表示切替</div>

          <div className="font-medium">t</div>
          <div>トレンドライン描画モード</div>

          <div className="font-medium">h</div>
          <div>水平線描画モード</div>

          <div className="font-medium">r</div>
          <div>RSI表示切替</div>

          <div className="font-medium">m</div>
          <div>MACD表示切替</div>

          <div className="font-medium">b</div>
          <div>ボリンジャーバンド表示切替</div>

          <div className="font-medium">1-4</div>
          <div>チャートスタイル切替</div>

          <div className="font-medium">?</div>
          <div>このヘルプを表示</div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
