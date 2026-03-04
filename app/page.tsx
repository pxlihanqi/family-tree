import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/images/login-bg.jpg')] bg-cover bg-center opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-stone-950" />
          <div className="absolute -top-24 right-[-20%] h-80 w-80 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-emerald-200/10 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-stone-300/80">Li Clan</p>
            <h1 className="text-3xl sm:text-5xl font-serif font-semibold leading-tight">
              西平堂李氏家族史：源远流长，世代相承
            </h1>
            <p className="text-base sm:text-lg text-stone-200/90 leading-relaxed">
              西平堂李氏家族源起中原，历代以耕读传家、清正立身为训。家族辈分延续至今，族人遍布多地，
              以和睦、勤俭、仁爱为风骨，在时代变迁中守护血脉记忆与家族荣光。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/family-tree"
                className="inline-flex items-center justify-center rounded-md bg-amber-400 px-5 py-2.5 text-sm font-semibold text-stone-900 shadow-lg shadow-amber-300/20 hover:bg-amber-300 transition-colors"
              >
                进入族谱
              </Link>
              <Link
                href="/family-tree/memorial"
                className="inline-flex items-center justify-center rounded-md border border-stone-400/50 px-5 py-2.5 text-sm font-semibold text-stone-100 hover:border-amber-300 hover:text-amber-200 transition-colors"
              >
                族谱纪念页
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 space-y-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">族训</p>
            <h2 className="mt-3 text-xl font-serif font-semibold">耕读传家 · 忠厚处世</h2>
            <p className="mt-3 text-sm text-stone-300 leading-relaxed">
              以学立身，以德立族，长幼有序，远近同心。家族传统以书香为根，以仁义为本。
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">族史</p>
            <h2 className="mt-3 text-xl font-serif font-semibold">迁徙与守望</h2>
            <p className="mt-3 text-sm text-stone-300 leading-relaxed">
              自中原启程，历经数次迁徙，族人择水而居，耕读不辍，保留家谱与祖训，凝聚家族记忆。
            </p>
          </div>
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400">精神</p>
            <h2 className="mt-3 text-xl font-serif font-semibold">仁爱与担当</h2>
            <p className="mt-3 text-sm text-stone-300 leading-relaxed">
              尊祖敬宗、扶危济困、勤俭持家。家族精神贯穿每一代，成为彼此联结的温暖纽带。
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6 sm:p-8">
          <h3 className="text-lg font-serif font-semibold">家族记忆长廊</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-stone-300">
            <div className="rounded-xl border border-stone-800/80 bg-stone-950/40 p-4">
              <p className="text-xs text-amber-300/80 uppercase tracking-[0.25em]">第 1 代</p>
              <p className="mt-2">立族祖先定居家园，开基创业。</p>
            </div>
            <div className="rounded-xl border border-stone-800/80 bg-stone-950/40 p-4">
              <p className="text-xs text-amber-300/80 uppercase tracking-[0.25em]">第 6 代</p>
              <p className="mt-2">家族兴学，族学启蒙，族规成书。</p>
            </div>
            <div className="rounded-xl border border-stone-800/80 bg-stone-950/40 p-4">
              <p className="text-xs text-amber-300/80 uppercase tracking-[0.25em]">第 12 代</p>
              <p className="mt-2">迁居拓展，支系繁衍，族人兴旺。</p>
            </div>
            <div className="rounded-xl border border-stone-800/80 bg-stone-950/40 p-4">
              <p className="text-xs text-amber-300/80 uppercase tracking-[0.25em]">今世</p>
              <p className="mt-2">跨越时代，共守家风，记载新篇。</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-gradient-to-r from-stone-900/80 via-stone-950/80 to-stone-900/80 p-6">
          <div>
            <h3 className="text-lg font-serif font-semibold">续写家族篇章</h3>
            <p className="text-sm text-stone-300 mt-1">进入族谱系统，补充成员信息、照片与家族记忆。</p>
          </div>
          <Link
            href="/family-tree"
            className="inline-flex items-center justify-center rounded-md bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-amber-200 transition-colors"
          >
            进入族谱管理
          </Link>
        </div>
      </div>
    </div>
  );
}
