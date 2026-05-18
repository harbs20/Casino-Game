import { useState } from "react";
import Blackjack from "./Blackjack";

function App() {
  const [screen, setScreen] = useState("home");

  if (screen === "blackjack") {
    return <Blackjack onBack={() => setScreen("home")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-[#21213e] flex flex-col items-center p-8">
      <h1 className="font-extrabold text-5xl text-yellow-400 drop-shadow-lg mb-6">
        🃏 Casino Royale 🪙
      </h1>
      <div className="flex gap-8 justify-center flex-wrap">
        <GameCard name="Blackjack" onPlay={() => setScreen("blackjack")} />
        <GameCard name="Slots" />
        <GameCard name="Roulette" />
        <GameCard name="Baccarat" />
      </div>
      <div className="mt-12 text-white opacity-75">
        Cash in chips, play games, cash out to earn XP and levels!
      </div>
    </div>
  );
}

function GameCard({ name, onPlay }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 w-48 text-center shadow-xl border-2 border-yellow-300
      hover:scale-105 hover:border-yellow-400 transition-all duration-300 cursor-pointer mb-6">
      <h2 className="text-2xl text-yellow-200 font-bold mb-2">{name}</h2>
      <div className="h-24 mb-2 flex items-center justify-center">
        <span className="text-5xl">{emojiForGame(name)}</span>
      </div>
      <button
        className="bg-yellow-400 hover:bg-yellow-300 font-bold px-4 py-2 rounded transition-all"
        onClick={onPlay}
        disabled={!onPlay}
      >
        Play
      </button>
    </div>
  );
}
function emojiForGame(name) {
  if (name === "Blackjack") return "🂡";
  if (name === "Slots") return "🎰";
  if (name === "Roulette") return "🎯";
  if (name === "Baccarat") return "♦️";
  return "🎲";
}
export default App;
