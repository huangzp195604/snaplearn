import React from 'react';
import { Sparkles, Home, CreditCard, User, Smartphone, Monitor } from 'lucide-react';

interface WechatFrameProps {
  activeTab: 'home' | 'card' | 'profile';
  setActiveTab: (tab: 'home' | 'card' | 'profile') => void;
  children: React.ReactNode;
  navTitle?: string;
  isSimulatorMode: boolean;
  setIsSimulatorMode: (val: boolean) => void;
}

export const WechatFrame: React.FC<WechatFrameProps> = ({
  activeTab,
  setActiveTab,
  children,
  navTitle = '拍照学英语',
  isSimulatorMode,
  setIsSimulatorMode,
}) => {
  // Current time for status bar
  const currentTime = '09:41';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start text-slate-100 font-sans p-0 sm:py-6 selection:bg-emerald-500/30">
      {/* Top Floating Control Bar (Simulator toggle & status info) */}
      <header className="w-full max-w-5xl px-4 py-2 flex items-center justify-between text-xs text-slate-400 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">SnapLearn 拍照学英语</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[11px]">
            微信小程序高保真全案模型
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulatorMode(!isSimulatorMode)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {isSimulatorMode ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>展开全屏模式</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>微信真机模拟器</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container - Either iPhone simulator bezel or modern responsive shell */}
      <div
        className={`w-full transition-all duration-300 flex flex-col bg-slate-950 ${
          isSimulatorMode
            ? 'max-w-[430px] min-h-[880px] rounded-[48px] shadow-2xl border-[8px] border-slate-800 relative overflow-hidden ring-1 ring-white/10'
            : 'max-w-4xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden'
        }`}
      >
        {/* Simulator Status Bar */}
        <div className="w-full h-11 bg-slate-950 px-7 flex items-center justify-between text-xs text-white/90 select-none shrink-0 z-30">
          <span className="font-semibold tracking-tight">{currentTime}</span>

          {/* iPhone Dynamic Island notch simulation */}
          {isSimulatorMode && (
            <div className="w-24 h-5 bg-black rounded-full mx-auto -mt-2 flex items-center justify-end pr-2">
              <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px]">
            <span>5G</span>
            <div className="w-5 h-2.5 border border-white/70 rounded-[3px] p-[1px] flex items-center">
              <div className="w-3/4 h-full bg-white rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* WeChat Mini Program Custom Header Navigation with Capsule */}
        <div className="w-full h-12 bg-slate-950/95 backdrop-blur-md px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-slate-100">{navTitle}</span>
          </div>

          {/* WeChat Mini-Program Official Capsule Button */}
          <div className="flex items-center bg-black/60 border border-white/20 rounded-full px-2.5 py-1 gap-2 shadow-inner">
            <button
              onClick={() => alert('微信小程序右上角胶囊菜单：\n• 转发好友/微信群\n• 添加到“我的小程序”\n• 浮窗')}
              className="text-white/80 hover:text-white flex items-center gap-0.5 text-xs font-bold px-1"
              title="小程序胶囊菜单"
            >
              <span>•••</span>
            </button>
            <div className="w-[1px] h-3 bg-white/20" />
            <button
              onClick={() => setActiveTab('home')}
              className="text-white/80 hover:text-white flex items-center justify-center p-0.5"
              title="返回首页 / 退出卡片"
            >
              <div className="w-3.5 h-3.5 rounded-full border border-white/80 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Scroll View */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-slate-950">
          {children}
        </div>

        {/* WeChat Mini Program Bottom Tab Bar */}
        <nav className="w-full h-16 bg-slate-950/95 border-t border-slate-800/80 px-6 flex items-center justify-around shrink-0 z-30 select-none">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">拍照探索</span>
          </button>

          <button
            onClick={() => setActiveTab('card')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'card' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] font-medium">学习卡片</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">我的 & 避坑</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
