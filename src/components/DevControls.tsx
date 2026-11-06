import { shiftDateKey, toDateKey } from '../lib/daily';
import { clearResult } from '../lib/storage';

/** Dev-only toolbar for moving between days and replaying. Not rendered in production builds. */
export function DevControls({ dateKey }: { dateKey: string }) {
  const goTo = (key: string) => {
    const url = new URL(window.location.href);
    if (key === toDateKey(new Date())) url.searchParams.delete('date');
    else url.searchParams.set('date', key);
    window.location.assign(url);
  };

  const reset = () => {
    clearResult(dateKey);
    window.location.reload();
  };

  return (
    <div className="dev-controls">
      <span className="dev-tag">DEV</span>
      <button onClick={() => goTo(shiftDateKey(dateKey, -1))}>◀ Prev</button>
      <span className="dev-date">{dateKey}</span>
      <button onClick={() => goTo(shiftDateKey(dateKey, 1))}>Next ▶</button>
      <button onClick={() => goTo(toDateKey(new Date()))}>Today</button>
      <button onClick={reset}>Reset day</button>
    </div>
  );
}
