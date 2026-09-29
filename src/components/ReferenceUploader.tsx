import { useEffect, useMemo } from 'react';
import type { CharacterReferences, ReferenceSlot } from '../types/character';

interface ReferenceUploaderProps {
  references: CharacterReferences;
  onSelect: (slot: ReferenceSlot, file: File | null) => void;
}

const labels: Record<ReferenceSlot, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back'
};

function ReferenceCard({
  slot,
  file,
  onSelect
}: {
  slot: ReferenceSlot;
  file: File | null;
  onSelect: (slot: ReferenceSlot, file: File | null) => void;
}) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <label className="reference-card">
      <span className="reference-title">{labels[slot]}</span>
      <span className="reference-preview">
        {preview ? (
          <img src={preview} alt={`${labels[slot]} reference preview`} />
        ) : (
          <span>Choose image</span>
        )}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => onSelect(slot, event.target.files?.[0] ?? null)}
      />
      <span className="reference-file">{file?.name ?? 'No image'}</span>
    </label>
  );
}

export default function ReferenceUploader({ references, onSelect }: ReferenceUploaderProps) {
  const slots: ReferenceSlot[] = ['front', 'side', 'back'];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>References</h2>
          <p>Front, side, and back estimate one shared editable character.</p>
        </div>
      </div>

      <div className="reference-grid">
        {slots.map((slot) => (
          <ReferenceCard key={slot} slot={slot} file={references[slot]} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
