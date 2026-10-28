import React from 'react';
import { KEY_SIGNATURES } from '../../utils/musicTheory';

const SHARP_KEYS = KEY_SIGNATURES.filter((k) => k.type === 'sharp');
const FLAT_KEYS = KEY_SIGNATURES.filter((k) => k.type === 'flat');

/**
 * Sélecteur épuré d'armure à la clé (0, 1♯..7♯, 1♭..7♭) sans afficher le nom des gammes,
 * afin d'entraîner le musicien à associer lui-même chaque armure à sa tonalité.
 */
export default function ScaleSelector({
  keySignature = 'C',
  onChange,
}) {
  const handleKeyChange = (newKeyId) => {
    if (onChange) {
      onChange({ keySignature: newKeyId });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-medium text-zinc-400">
          Armure à la clé
        </span>
        <span className="text-[11px] text-zinc-500">
          {keySignature === 'C'
            ? 'Aucune altération (0)'
            : KEY_SIGNATURES.find((k) => k.id === keySignature)?.badge}
        </span>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 space-y-2.5 backdrop-blur-md">
        {/* Armure vierge (0) */}
        <button
          type="button"
          onClick={() => handleKeyChange('C')}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center transition-all border backdrop-blur-sm ${
            keySignature === 'C'
              ? 'apple-segment-active'
              : 'glass-tile text-zinc-300'
          }`}
        >
          <span>0 — Aucune altération à la clé</span>
        </button>

        {/* Ligne des 7 armures avec Dièses (1♯ à 7♯) */}
        <div className="space-y-1">
          <span className="block text-[10px] text-zinc-400 px-0.5">
            Dièses (♯)
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {SHARP_KEYS.map((item) => {
              const selected = keySignature === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleKeyChange(item.id)}
                  className={`py-2.5 px-1 rounded-xl text-center transition-all border flex items-center justify-center font-display text-xs sm:text-sm font-bold backdrop-blur-sm ${
                    selected
                      ? 'apple-segment-active'
                      : 'glass-tile text-white'
                  }`}
                >
                  {item.badge}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ligne des 7 armures avec Bémols (1♭ à 7♭) */}
        <div className="space-y-1">
          <span className="block text-[10px] text-zinc-400 px-0.5">
            Bémols (♭)
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {FLAT_KEYS.map((item) => {
              const selected = keySignature === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleKeyChange(item.id)}
                  className={`py-2.5 px-1 rounded-xl text-center transition-all border flex items-center justify-center font-display text-xs sm:text-sm font-bold backdrop-blur-sm ${
                    selected
                      ? 'apple-segment-active'
                      : 'glass-tile text-white'
                  }`}
                >
                  {item.badge}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
