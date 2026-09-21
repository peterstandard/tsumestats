<script lang="ts">
  import { recordsStore } from '$lib/stores/records.svelte';
  import {
    X,
    Upload,
    FileJson,
    Bookmark,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    ShieldCheck
  } from 'lucide-svelte';

  interface Props {
    open: boolean;
    initialTab?: 'import' | 'bookmarklet';
    onClose: () => void;
  }

  let { open, initialTab = 'import', onClose }: Props = $props();

  let activeTab = $state<'import' | 'bookmarklet'>('import');
  let jsonText = $state('');
  let importError = $state<string | null>(null);
  let importSuccess = $state<string | null>(null);
  let copiedBookmarklet = $state(false);
  let isDragging = $state(false);

  // Sync activeTab when modal opens with initialTab
  $effect(() => {
    if (open) {
      activeTab = initialTab;
      importError = null;
      importSuccess = null;
    }
  });

  const BOOKMARKLET_CODE = `javascript:(function(){try{if(typeof records!=='undefined'&&Array.isArray(records)){var s=JSON.stringify(records);var done=function(){alert('Copied '+records.length+' 101weiqi test records to clipboard! Paste into tsumestats.')};var fb=function(){var t=document.createElement('textarea');t.value=s;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.focus();t.select();var ok=document.execCommand('copy');document.body.removeChild(t);return ok;};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(done).catch(function(){if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s)}});}else if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s);}}else{alert('101weiqi records variable not found. Please navigate to https://www.101weiqi.com/guan/my/ first.');}}catch(e){alert('Copy failed: '+e.message);}})();`;

  function handlePasteImport() {
    importError = null;
    importSuccess = null;

    if (!jsonText.trim()) {
      importError = 'Please paste a JSON array or test records string.';
      return;
    }

    try {
      const res = recordsStore.importRecords(jsonText);
      importSuccess = `Successfully imported ${res.total} records (${res.added} new records merged)!`;
      jsonText = '';
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (e: unknown) {
      importError = e instanceof Error ? e.message : 'Invalid JSON format.';
    }
  }

  function handleFileUpload(file: File) {
    importError = null;
    importSuccess = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const res = recordsStore.importRecords(content);
        importSuccess = `Successfully imported ${res.total} records from ${file.name} (${res.added} new records merged)!`;
        setTimeout(() => {
          onClose();
        }, 1400);
      } catch (err: unknown) {
        importError = err instanceof Error ? err.message : 'Failed to parse JSON file.';
      }
    };
    reader.readAsText(file);
  }

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  function copyBookmarklet() {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    copiedBookmarklet = true;
    setTimeout(() => {
      copiedBookmarklet = false;
    }, 2000);
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D2A1F]/60 backdrop-blur-xs">
    <div class="bg-[#FDF5E6] border-2 border-[#D6BA96] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="p-4 bg-[#FAF0DA] border-b border-[#D6BA96] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-[#88C13F] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            詰
          </div>
          <h2 class="text-base font-bold text-[#3D2A1F]">101weiqi Data Import & Bookmarklet</h2>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-[#5e4537] hover:bg-[#F4E7CE] hover:text-[#3D2A1F] transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tab Switcher -->
      <div class="flex border-b border-[#D6BA96] bg-[#FAF0DA]/50 px-4 pt-2">
        <button
          onclick={() => (activeTab = 'import')}
          class="px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer {activeTab === 'import' ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
        >
          <span class="flex items-center gap-1.5">
            <Upload class="w-3.5 h-3.5" />
            Paste JSON / Upload File
          </span>
        </button>
        <button
          onclick={() => (activeTab = 'bookmarklet')}
          class="px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer {activeTab === 'bookmarklet' ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
        >
          <span class="flex items-center gap-1.5">
            <Bookmark class="w-3.5 h-3.5" />
            Bookmarklet & Instructions
          </span>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        <!-- Privacy & Client-Side Notice -->
        <div class="bg-[#eaf6dc]/80 border border-[#88C13F]/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#3D2A1F] shadow-2xs">
          <ShieldCheck class="w-4 h-4 text-[#55821c] shrink-0 mt-0.5" />
          <div class="leading-relaxed">
            <span class="font-bold text-[#55821c]">100% Client-Side & Private:</span>
            <span class="text-[#5e4537]">
              Your test data is parsed and stored exclusively inside your browser (<code class="bg-[#FAF0DA] px-1 py-0.5 rounded text-[#8B5E3C]">localStorage</code>). Nothing is ever sent to a server, tracked, or stored anywhere on the internet.
            </span>
          </div>
        </div>

        {#if activeTab === 'import'}
          <!-- File Drop Zone -->
          <div
            role="region"
            aria-label="File upload drop zone"
            ondragover={(e) => { e.preventDefault(); isDragging = true; }}
            ondragleave={() => (isDragging = false)}
            ondrop={handleFileDrop}
            class="border-2 border-dashed rounded-xl p-5 text-center transition-colors {isDragging ? 'border-[#88C13F] bg-[#eaf6dc]' : 'border-[#D6BA96] bg-[#FAF0DA]/40 hover:bg-[#FAF0DA]'}"
          >
            <FileJson class="w-8 h-8 text-[#8B5E3C] mx-auto mb-2" />
            <p class="text-xs font-bold text-[#3D2A1F]">
              Drag and drop your 101weiqi JSON file here
            </p>
            <p class="text-[11px] text-[#5e4537] mt-0.5">
              or browse from your computer
            </p>
            <label class="mt-3 inline-block">
              <span class="px-3 py-1.5 bg-[#8B5E3C] hover:bg-[#6e472a] text-white font-medium text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
                Browse File
              </span>
              <input
                type="file"
                accept=".json,application/json"
                class="hidden"
                onchange={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files?.[0]) handleFileUpload(target.files[0]);
                }}
              />
            </label>
          </div>

          <div class="flex items-center my-2">
            <div class="grow border-t border-[#D6BA96]"></div>
            <span class="px-3 text-[11px] font-semibold uppercase text-[#5e4537]">or paste JSON text</span>
            <div class="grow border-t border-[#D6BA96]"></div>
          </div>

          <!-- Textarea -->
          <div>
            <label for="json-input" class="block text-xs font-semibold text-[#3D2A1F] mb-1">
              JSON Records Array (from <code class="bg-[#FAF0DA] px-1 py-0.5 rounded text-[#8B5E3C]">copy(records)</code>):
            </label>
            <textarea
              id="json-input"
              bind:value={jsonText}
              rows="6"
              placeholder={`[\n  {\n    "t": 1783461970,\n    "status": 1,\n    "oknum": 6,\n    "totaltime": 292,\n    "guanid": 9903229,\n    "number": 6\n  }\n]`}
              class="w-full text-xs font-mono p-3 bg-[#FAF0DA] border border-[#D6BA96] rounded-xl text-[#3D2A1F] placeholder-[#5e4537]/50 focus:outline-none focus:ring-2 focus:ring-[#88C13F]"
            ></textarea>
          </div>

          <!-- Feedback messages -->
          {#if importError}
            <div class="p-3 bg-[#fbeee9] border border-[#c84b31]/40 rounded-xl text-xs text-[#c84b31] flex items-center gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          {/if}

          {#if importSuccess}
            <div class="p-3 bg-[#eaf6dc] border border-[#88C13F]/50 rounded-xl text-xs text-[#55821c] flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          {/if}

          <!-- Submit Button -->
          <div class="flex justify-end gap-2 pt-2">
            <button
              onclick={onClose}
              class="px-4 py-2 text-xs font-medium border border-[#D6BA96] bg-[#FAF0DA] hover:bg-[#F4E7CE] text-[#3D2A1F] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onclick={handlePasteImport}
              class="px-5 py-2 text-xs font-bold bg-[#88C13F] hover:bg-[#78ab37] text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload class="w-3.5 h-3.5" />
              Import Records
            </button>
          </div>
        {:else}
          <!-- Bookmarklet Guide Tab -->
          <div class="space-y-4 text-xs text-[#3D2A1F]">
            <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4">
              <h3 class="font-bold text-sm text-[#3D2A1F] mb-1">How to copy your 101weiqi test history</h3>
              <p class="text-[11px] text-[#5e4537] leading-relaxed">
                101weiqi loads your complete checkpoint history into an internal JavaScript variable (<code class="bg-[#FDF5E6] px-1 py-0.5 rounded text-[#8B5E3C]">records</code>). This bookmarklet copies all your test records directly to your clipboard with one click.
              </p>
            </div>

            <!-- Step 1 -->
            <div class="space-y-2">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">1</span>
                <span>Copy the Bookmarklet Code</span>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  value={BOOKMARKLET_CODE}
                  class="grow text-[11px] font-mono p-2 bg-[#FAF0DA] border border-[#D6BA96] rounded-lg text-[#5e4537] truncate focus:outline-none"
                />
                <button
                  onclick={copyBookmarklet}
                  class="px-3 py-2 bg-[#88C13F] hover:bg-[#78ab37] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                >
                  {#if copiedBookmarklet}
                    <Check class="w-3.5 h-3.5" />
                    Copied!
                  {:else}
                    <Copy class="w-3.5 h-3.5" />
                    Copy Script
                  {/if}
                </button>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="space-y-1">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">2</span>
                <span>Create a Browser Bookmark</span>
              </div>
              <p class="text-[11px] text-[#5e4537] ml-7">
                Bookmark any page in your browser (e.g. press <kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Ctrl+D</kbd> or <kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Cmd+D</kbd>). Name it <strong>"Copy 101weiqi Records"</strong>, and paste the code above into the <strong>URL / Location</strong> field.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="space-y-1">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">3</span>
                <span>Click on Your 101weiqi History Page</span>
              </div>
              <p class="text-[11px] text-[#5e4537] ml-7">
                Go to your <a href="https://www.101weiqi.com/guan/my/" target="_blank" rel="noopener noreferrer" class="text-[#8B5E3C] underline font-semibold">101weiqi test history page (https://www.101weiqi.com/guan/my/)</a>. Click your bookmark! All your test records will be instantly copied to your clipboard.
              </p>
            </div>

            <!-- Step 4 -->
            <div class="space-y-1">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">4</span>
                <span>Paste & Import</span>
              </div>
              <p class="text-[11px] text-[#5e4537] ml-7">
                Return to this modal, switch to the <strong>Paste JSON / Upload File</strong> tab, paste (<kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Ctrl+V</kbd> or <kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Cmd+V</kbd>), and click <strong>Import Records</strong>.
              </p>
            </div>

            <!-- Chrome Console alternative -->
            <div class="bg-[#FDF5E6] border border-[#D6BA96] rounded-xl p-3 mt-3">
              <div class="font-bold text-[11px] text-[#3D2A1F] mb-1">Developer Console Alternative:</div>
              <p class="text-[11px] text-[#5e4537]">
                Alternatively, open Chrome DevTools (<kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">F12</kbd>) on <a href="https://www.101weiqi.com/guan/my/" target="_blank" rel="noopener noreferrer" class="text-[#8B5E3C] underline font-semibold">https://www.101weiqi.com/guan/my/</a>, go to the <strong>Console</strong> tab, and run:
              </p>
              <code class="block bg-[#FAF0DA] border border-[#D6BA96] rounded p-2 text-xs font-mono text-[#8B5E3C] mt-1.5 select-all">
                copy(records)
              </code>
              <p class="text-[10px] text-[#5e4537] mt-1">
                Then switch to the "Paste JSON" tab and paste your clipboard.
              </p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
