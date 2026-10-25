import stampReference from '../../assets-src/stamp-reference.png';
import { UnionStamp } from '../letter/UnionStamp';

export default function StampCompare() {
  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, flexWrap: 'wrap', alignItems: 'center' }}>
      <img src={stampReference} width={294} alt="Reference" />
      <div style={{ width: 294, padding: 20 }}>
        <UnionStamp size={254} />
      </div>
      <div style={{ padding: 20 }}>
        <UnionStamp size={64} />
      </div>
    </div>
  );
}
