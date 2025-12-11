import { useState, useEffect } from 'react';
import { LayoutShell } from './layout/LayoutShell';
import { HeaderBar } from './layout/HeaderBar';
import { SidebarModules } from './layout/SidebarModules';
import { FileDropZone } from './components/upload/FileDropZone';
import { ScanSummaryStrip } from './components/summary/ScanSummaryStrip';
import { InsightsPanel } from './components/summary/InsightsPanel';
import { FiltersBar } from './components/filters/FiltersBar';
import { FilesTable } from './components/files/FilesTable';
import { FileDetailPanel } from './components/files/FileDetailPanel';
import { useDocumentsStore } from './store/useDocumentsStore';

function App() {
  const store = useDocumentsStore();
  const {
    filtered, filters, selectedId, setFilters, selectDocument, items,
    scanJob,
    runMetadataBasicScan, runMetadataDeepScan, // exportMetadataCsv,
    reclassifyDocument, exportClassificationCsv,
    runOcrForDocument
  } = store;

  const [isDark, setIsDark] = useState(false);

  // Theme Toggle Logic
  useEffect(() => {
    // Check system preference or default to light as per prompt preference "Fondo claro: gris muy suave"
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Optional: Start with system preference. 
      // For this demo, let's start light or respect system
      setIsDark(false); // Force default light for clean start unless user toggles
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Selected document helper
  const selectedDoc = items.find(d => d.basic.id === selectedId) || null;

  return (
    <LayoutShell>
      <HeaderBar isDark={isDark} toggleTheme={toggleTheme} />

      <div className="flex gap-6">
        {/* Sidebar for Modules */}
        <SidebarModules />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Upload Area */}
          <section>
            <FileDropZone />
          </section>

          {/* Quick Stats */}
          <section className="space-y-6">
            <ScanSummaryStrip documents={items} scanJob={scanJob} />
            <InsightsPanel documents={items} />
          </section>

          {/* Search & Filtering */}
          <section>
            <FiltersBar filters={filters} onChange={setFilters} />
          </section>

          {/* Files Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr] gap-6 items-start h-[calc(100vh-400px)] min-h-[500px]">
            {/* Left: Table */}
            <div className="h-full flex flex-col">
              <FilesTable
                documents={filtered}
                onSelect={selectDocument}
                selectedId={selectedId}
              />
            </div>

            {/* Right: Details */}
            <div className="h-full flex flex-col">
              <FileDetailPanel
                document={selectedDoc}


                onMetadataBasicScan={runMetadataBasicScan}
                onMetadataDeepScan={runMetadataDeepScan}
                // onExportMetadataCsv={exportMetadataCsv}

                onReclassify={reclassifyDocument}
                onExportClassificationCsv={exportClassificationCsv}
                onRunOcr={runOcrForDocument}
              />
            </div>
          </div>
        </main>
      </div>
    </LayoutShell>
  );
}

export default App;
