import React, { useEffect, useRef } from 'react';
import { LogEntry, TaskStatus } from '../types/index.js';

interface TasksViewProps {
  taskStatus: TaskStatus;
  instanceName: string | undefined;
  onBack: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ taskStatus, instanceName, onBack }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal console to the bottom when new logs flow in
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [taskStatus.logs]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="cyan-gradient-text">Console Controller</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            {taskStatus.active
              ? `Syncing dependencies and overlaying configs for "${instanceName || 'Selected Profile'}"`
              : 'No active installation. Standby.'}
          </p>
        </div>
        <button className="pill-btn" onClick={onBack}>
          &larr; Back to Dashboard
        </button>
      </header>

      {/* Progress Monitor */}
      {taskStatus.active && (
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>{taskStatus.currentStep}</span>
            <span style={{ color: 'var(--color-accent)' }}>{taskStatus.progress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div
              style={{
                width: `${taskStatus.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-accent-dim) 0%, var(--color-accent) 100%)',
                boxShadow: '0 0 10px rgba(102, 252, 241, 0.5)',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Terminal logs */}
      <div
        className="glass-panel"
        style={{
          flex: 1,
          background: '#040508',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          overflowY: 'auto',
          maxHeight: '400px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
        }}
      >
        <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {taskStatus.logs.map((log: LogEntry, idx: number) => {
            let color = 'var(--color-text-secondary)';
            if (log.level === 'warn') color = 'var(--color-warning)';
            if (log.level === 'error') color = 'var(--color-error)';
            if (log.message.startsWith('***')) color = 'var(--color-success)';

            return (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>[{log.timestamp}]</span>
                <span style={{ color, wordBreak: 'break-all' }}>{log.message}</span>
              </div>
            );
          })}

          {taskStatus.logs.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '40px 0' }}>
              Terminal idle. Run Sync & Install on a profile to stream deployment metrics here.
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
export default TasksView;
