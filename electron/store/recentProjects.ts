import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
}

const getStorePath = () => {
  return path.join(app.getPath('userData'), 'recent-projects.json');
};

export function loadRecentProjects(): RecentProject[] {
  try {
    const filePath = getStorePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const parsed: RecentProject[] = JSON.parse(rawData);

    if (!Array.isArray(parsed)) return [];

    // Filter out paths that no longer exist on disk
    const validProjects = parsed.filter(p => {
      try {
        return fs.existsSync(p.path) && fs.statSync(p.path).isDirectory();
      } catch {
        return false;
      }
    });

    // Sort by lastOpened descending
    return validProjects.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 10);
  } catch (err) {
    console.error('Failed to load recent projects:', err);
    return [];
  }
}

export function saveRecentProjects(projects: RecentProject[]): void {
  try {
    const filePath = getStorePath();
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save recent projects:', err);
  }
}

export function addRecentProject(folderPath: string): RecentProject[] {
  const current = loadRecentProjects();
  const folderName = path.basename(folderPath) || folderPath;
  
  const existingIdx = current.findIndex(p => path.normalize(p.path) === path.normalize(folderPath));
  if (existingIdx !== -1) {
    current.splice(existingIdx, 1);
  }

  current.unshift({
    path: folderPath,
    name: folderName,
    lastOpened: Date.now()
  });

  const capped = current.slice(0, 10);
  saveRecentProjects(capped);
  return capped;
}

export function removeRecentProject(folderPath: string): RecentProject[] {
  const current = loadRecentProjects();
  const filtered = current.filter(p => path.normalize(p.path) !== path.normalize(folderPath));
  saveRecentProjects(filtered);
  return filtered;
}
