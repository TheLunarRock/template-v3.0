'use client'

import React, { useState } from 'react'

type UIStyle = 
  | 'neumorphism' 
  | 'glassmorphism' 
  | 'brutalism' 
  | 'minimalist' 
  | 'retro' 
  | 'cyberpunk'
  | 'gradient'
  | 'organic'
  | 'memphis'
  | 'swiss'

export const UIShowcase = () => {
  const [selectedStyle, setSelectedStyle] = useState<UIStyle>('neumorphism')
  const [isDark, setIsDark] = useState(false)

  const styles: Record<UIStyle, { name: string; description: string; example: JSX.Element }> = {
    neumorphism: {
      name: 'Neumorphism 🔮',
      description: '柔らかい影で立体感を表現',
      example: (
        <div className="p-8 bg-gray-200">
          <button className="btn-neumorphism mb-4">Neumorphism Button</button>
          <div className="card-neumorphism">
            <h3 className="text-xl font-rounded mb-2">Neumorphism Card</h3>
            <p className="font-rounded text-gray-600">まるで画面から浮き出ているような質感</p>
          </div>
        </div>
      )
    },
    glassmorphism: {
      name: 'Glassmorphism 🪟',
      description: '半透明でぼかし効果',
      example: (
        <div className="p-8 bg-gradient-ocean">
          <button className="btn-glass mb-4">Glass Button</button>
          <div className="card-glass">
            <h3 className="text-xl font-rounded mb-2">Glass Card</h3>
            <p className="font-rounded">macOS Big Sur風の高級感</p>
          </div>
        </div>
      )
    },
    brutalism: {
      name: 'Brutalism 🏗️',
      description: '太い境界線、生のHTML感',
      example: (
        <div className="p-8 bg-pink-200">
          <button className="btn-brutal mb-4">BRUTAL BUTTON</button>
          <div className="card-brutal">
            <h3 className="text-2xl font-bold mb-2">BRUTAL CARD</h3>
            <p className="font-bold">強烈な色使いと太い境界線</p>
          </div>
        </div>
      )
    },
    minimalist: {
      name: 'Minimalist ⚪',
      description: '極限まで削ぎ落とされたデザイン',
      example: (
        <div className="p-16 bg-white">
          <button className="btn-minimal mb-8">Minimal Button</button>
          <div className="card-minimal">
            <h3 className="text-lg font-light mb-4">Minimal Card</h3>
            <p className="font-light text-gray-600">大量の余白とタイポグラフィ重視</p>
          </div>
        </div>
      )
    },
    retro: {
      name: 'Retro/Vintage 📼',
      description: '80年代風ネオンとグリッド',
      example: (
        <div className="p-8 bg-black">
          <button className="btn-retro mb-4">RETRO BUTTON</button>
          <div className="card-retro">
            <h3 className="text-xl font-retro mb-2">RETRO CARD</h3>
            <p className="font-mono">Vaporwave aesthetic with neon colors</p>
          </div>
        </div>
      )
    },
    cyberpunk: {
      name: 'Cyberpunk 🤖',
      description: 'ネオンカラーとグリッチエフェクト',
      example: (
        <div className="p-8 bg-black cursor-cyber">
          <button className="btn-cyber mb-4">CYBER BUTTON</button>
          <div className="card-cyber">
            <h3 className="text-xl font-cyber mb-2 glitch" data-text="CYBER CARD">CYBER CARD</h3>
            <p className="font-cyber text-sm">Terminal style with neon glow</p>
          </div>
        </div>
      )
    },
    gradient: {
      name: 'Gradient/Duotone 🌈',
      description: 'Instagram風グラデーション',
      example: (
        <div className="p-8 bg-gray-100">
          <button className="btn-gradient mb-4">Gradient Button</button>
          <div className="card-gradient">
            <h3 className="text-xl font-rounded mb-2">Gradient Card</h3>
            <p className="font-rounded">美しいグラデーション効果</p>
          </div>
        </div>
      )
    },
    organic: {
      name: 'Organic/Natural 🌿',
      description: '不規則な形状とアースカラー',
      example: (
        <div className="p-8 bg-sky-blue">
          <button className="btn-organic mb-4 font-rounded">Organic Button</button>
          <div className="card-organic">
            <h3 className="text-xl font-rounded mb-2 text-earth-brown">Organic Card</h3>
            <p className="font-rounded text-earth-brown">自然のテクスチャと不規則な形状</p>
          </div>
        </div>
      )
    },
    memphis: {
      name: 'Memphis Design 🔺',
      description: '幾何学模様とパステルカラー',
      example: (
        <div className="p-8 bg-pink-100">
          <button className="btn-memphis mb-4">Memphis Button</button>
          <div className="card-memphis">
            <h3 className="text-xl font-bold mb-2">Memphis Card</h3>
            <p className="font-bold">80年代ポップアート風</p>
          </div>
        </div>
      )
    },
    swiss: {
      name: 'Swiss Design 🇨🇭',
      description: 'グリッドシステムとサンセリフ体',
      example: (
        <div className="p-8 bg-gray-50">
          <button className="btn-swiss mb-4">SWISS BUTTON</button>
          <div className="card-swiss">
            <h3 className="text-2xl font-sans mb-4">Swiss Card</h3>
            <p className="font-sans">機能美と左揃えレイアウト</p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-rounded mb-8 text-center">
          UI Design Showcase
        </h1>
        
        {/* Dark Mode Toggle */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setIsDark(!isDark)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Style Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {(Object.keys(styles) as UIStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`p-3 rounded-lg font-rounded text-sm transition-all ${
                selectedStyle === style
                  ? 'bg-blue-500 text-white scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {styles[style].name}
            </button>
          ))}
        </div>

        {/* Selected Style Display */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-rounded mb-4">
            {styles[selectedStyle].name}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 font-rounded">
            {styles[selectedStyle].description}
          </p>
          
          {/* Example Component */}
          <div className="rounded-xl overflow-hidden">
            {styles[selectedStyle].example}
          </div>
          
          {/* Usage Code */}
          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <h3 className="text-lg font-mono mb-2">使用方法:</h3>
            <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {`<button className="btn-${selectedStyle}">Button</button>`}
              <br />
              {`<div className="card-${selectedStyle}">Card Content</div>`}
            </code>
          </div>
        </div>

        {/* Quick Copy Buttons */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-rounded mb-4">ボタンクラス</h3>
            <div className="space-y-2">
              <div className="font-mono text-sm">btn-neumorphism</div>
              <div className="font-mono text-sm">btn-glass</div>
              <div className="font-mono text-sm">btn-brutal</div>
              <div className="font-mono text-sm">btn-cyber</div>
              <div className="font-mono text-sm">btn-gradient</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-rounded mb-4">カードクラス</h3>
            <div className="space-y-2">
              <div className="font-mono text-sm">card-neumorphism</div>
              <div className="font-mono text-sm">card-glass</div>
              <div className="font-mono text-sm">card-brutal</div>
              <div className="font-mono text-sm">card-cyber</div>
              <div className="font-mono text-sm">card-gradient</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}