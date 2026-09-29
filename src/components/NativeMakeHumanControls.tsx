import { useEffect, useMemo, useState } from 'react';
import { getMakeHumanDefinitionText } from '../lib/desktop';
import { parseMakeHumanSliders, type MakeHumanSlider } from '../lib/makehumanDefinitions';
import type { CharacterState } from '../types/character';

interface Props {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
}

export default function NativeMakeHumanControls({ character, onChange }: Props) {
  const [sliders, setSliders] = useState<MakeHumanSlider[]>([]);
  const [category, setCategory] = useState('Face');
  const [section, setSection] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMakeHumanDefinitionText('modeling_sliders.json'),
      getMakeHumanDefinitionText('measurement_sliders.json')
    ]).then(([modeling, measurements]) => {
      setSliders([...parseMakeHumanSliders(modeling), ...parseMakeHumanSliders(measurements)]);
      setError(null);
    }).catch((reason) => setError(String(reason)));
  }, []);

  const categories = useMemo(() => [...new Set(sliders.map((slider) => slider.category))], [sliders]);
  const categorySliders = sliders.filter((slider) => slider.category === category);
  const sections = [...new Set(categorySliders.map((slider) => slider.section))];
  const activeSection = sections.includes(section) ? section : sections[0] ?? '';
  const visible = categorySliders.filter((slider) => slider.section === activeSection);

  const setValue = (id: string, value: number) =>
    onChange({ ...character, nativeModifiers: { ...(character.nativeModifiers ?? {}), [id]: value } });

  if (error) return <div className="mh-native-empty">MakeHuman modifier definitions unavailable: {error}</div>;
  if (!sliders.length) return <div className="mh-native-empty">Loading MakeHuman modifier library…</div>;

  return (
    <div className="mh-native-browser">
      <nav className="mh-native-categories" aria-label="MakeHuman modeling category">
        {categories.map((name) => (
          <button type="button" key={name} className={category === name ? 'active' : ''} onClick={() => { setCategory(name); setSection(''); }}>
            {name}
          </button>
        ))}
      </nav>
      <div className="mh-native-workarea">
        <nav className="mh-native-sections" aria-label="MakeHuman modeling section">
          {sections.map((name) => (
            <button type="button" key={name} className={activeSection === name ? 'active' : ''} onClick={() => setSection(name)}>
              {name}
            </button>
          ))}
        </nav>
        <div className="control-stack mh-native-controls">
          {visible.map((slider) => {
            const value = character.nativeModifiers?.[slider.id] ?? 0;
            return (
              <label className="range-control" key={slider.id} title={slider.id}>
                <span><strong>{slider.label}</strong><output>{value.toFixed(2)}</output></span>
                <input type="range" min={slider.bipolar ? -1 : 0} max="1" step="0.01" value={value}
                  onChange={(event) => setValue(slider.id, Number(event.target.value))} />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
