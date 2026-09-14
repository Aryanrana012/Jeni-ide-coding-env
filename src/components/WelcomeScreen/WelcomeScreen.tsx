import React, { useEffect } from 'react';
import { FolderOpen, Clock, Bot, ArrowRight, Code, Terminal, Sparkles } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const WelcomeScreen: React.FC = () => {
  const { openFolder, openFolderByPath, recentProjects, loadRecentProjects, isOpeningFolder, workspaceError } = useIDEStore();

  useEffect(() => {
    loadRecentProjects();
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-background text-gray-200 select-none p-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-jeni-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full flex flex-col items-center text-center z-10">
        {/* Logo Badge */}
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white border border-jeni-purple/50 mb-6 glow-accent">
          <span className="font-extrabold text-3xl tracking-wider">J</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-primary mb-2">
          Jeni IDE
        </h1>

        <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-8">
          Your AI-native development environment. Designed for high speed, clean typography, and seamless human-AI pair programming.
        </p>

        {/* Primary Action Button */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => openFolder()}
            disabled={isOpeningFolder}
            className="flex items-center gap-2.5 px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-wait text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-950/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderOpen className="w-4 h-4" />
            {isOpeningFolder ? 'Opening Workspace...' : 'Open Workspace Folder'}
          </button>
        </div>

        {workspaceError && (
          <p role="alert" className="max-w-md mb-6 text-xs text-red-300">
            {workspaceError}
          </p>
        )}

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && (
          <div className="w-full text-left bg-surface/80 border border-surface-border rounded-2xl p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Recent Workspaces
              </span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
              {recentProjects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => openFolderByPath(project.path)}
                  className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-highlight border border-transparent hover:border-surface-border transition-all text-left"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-medium text-gray-200 group-hover:text-white truncate">
                      {project.name}
                    </span>
                    <span className="text-[11px] text-gray-500 truncate" title={project.path}>
                      {project.path}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Pill Highlights */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-indigo-400" /> Monaco Editor
          </span>
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Integrated PTY
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-jeni-purple" /> Jeni Agent Ready
          </span>
        </div>
      </div>
    </div>
  );
};
