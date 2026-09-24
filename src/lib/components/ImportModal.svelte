<script lang="ts">
  import { platformStore } from '$lib/stores/platform.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { heroStore } from '$lib/stores/heroRecords.svelte';
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

  let isWeiqi = $derived(platformStore.activePlatform === '101weiqi');

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

  const WEIQI_BOOKMARKLET = `javascript:(function(){try{if(typeof records!=='undefined'&&Array.isArray(records)){var s=JSON.stringify(records);var done=function(){alert('Copied '+records.length+' 101weiqi test records to clipboard! Paste into tsumestats.')};var fb=function(){var t=document.createElement('textarea');t.value=s;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.focus();t.select();var ok=document.execCommand('copy');document.body.removeChild(t);return ok;};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(done).catch(function(){if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s)}});}else if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s);}}else{alert('101weiqi records variable not found. Please navigate to https://www.101weiqi.com/guan/my/ first.');}}catch(e){alert('Copy failed: '+e.message);}})();`;

  const HERO_BOOKMARKLET = `javascript:(async function(){try{var t=document.querySelectorAll('table')[1];if(!t){alert('Please navigate to your Tsumego Hero Solve History page (/users/solveHistory/...) first.');return;}function p(d){var rows=(d.querySelectorAll('table')[1]||d.querySelector('table'))?.querySelectorAll('tr')||[];var it=[];for(var i=1;i<rows.length;i++){var c=rows[i].querySelectorAll('td');if(c.length>=7){var aS=c[0].querySelector('a');var aP=c[1].querySelector('a');var sN=c[0].textContent.trim();var pR=c[1].textContent.trim().split('-')[0].trim();var dS=c[6].textContent.trim();if(sN&&pR&&dS){it.push({set:sN,setUrl:aS?aS.getAttribute('href'):null,tsumego:pR,probUrl:aP?aP.getAttribute('href'):null,solved:c[2].textContent.trim()==='✓',misplays:parseInt(c[3].textContent.trim(),10)||0,rating:parseInt(c[4].textContent.trim(),10)||0,xp:parseInt(c[5].textContent.trim(),10)||0,date:dS});}}}return it;}var all=p(document);var totalPages=1;var curPage=1;var infoEl=document.querySelector('.pagination__info');if(infoEl){var cm=infoEl.textContent.match(/Page\\s+(\\d+)\\s+of\\s+(\\d+)/i);if(cm){curPage=parseInt(cm[1],10)||1;totalPages=parseInt(cm[2],10)||1;}else{var om=infoEl.textContent.match(/of\\s+(\\d+)/i);if(om)totalPages=parseInt(om[1],10)||1;}}else{var pLinks=Array.from(document.querySelectorAll('a[href*="page="]'));for(var i=0;i<pLinks.length;i++){var pm=pLinks[i].href.match(/page=(\\d+)/);if(pm){var pN=parseInt(pm[1],10);if(pN>totalPages)totalPages=pN;}}}if(totalPages>50)totalPages=50;var cancelled=false;if(totalPages>1){var box=document.createElement('div');box.style.cssText='position:fixed;top:20px;right:20px;background:#FAF0DA;color:#3D2A1F;padding:14px 18px;border-radius:12px;font-family:sans-serif;font-size:12px;z-index:9999999;box-shadow:0 8px 24px rgba(61,42,31,0.3);border:2px solid #8052cf;min-width:260px;';var titleDiv=document.createElement('div');titleDiv.style.cssText='font-weight:bold;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:6px;';titleDiv.innerHTML='<span style="color:#8052cf">●</span> Tsumego Hero Scraper';var statusDiv=document.createElement('div');statusDiv.style.cssText='color:#5e4537;margin-bottom:10px;line-height:1.4;';statusDiv.textContent='Page '+curPage+' of '+totalPages+' ('+all.length+' solves)...';var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;justify-content:flex-end;gap:6px;';var cancelBtn=document.createElement('button');cancelBtn.style.cssText='background:#fbeee9;color:#c84b31;border:1px solid rgba(200,75,49,0.4);padding:5px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;';cancelBtn.textContent='Cancel';cancelBtn.onclick=function(){cancelled=true;cancelBtn.textContent='Stopping...';};var stopBtn=document.createElement('button');stopBtn.style.cssText='background:#8052cf;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;';stopBtn.textContent='Stop & Copy';stopBtn.onclick=function(){cancelled=true;stopBtn.textContent='Copying...';};btnRow.appendChild(cancelBtn);btnRow.appendChild(stopBtn);box.appendChild(titleDiv);box.appendChild(statusDiv);box.appendChild(btnRow);document.body.appendChild(box);for(var pg=1;pg<=totalPages;pg++){if(cancelled)break;if(pg===curPage)continue;statusDiv.textContent='Fetching page '+pg+' of '+totalPages+' ('+all.length+' solves)...';try{var r=await fetch('?page='+pg);if(!r.ok)break;var h=await r.text();var pr=new DOMParser();var doc=pr.parseFromString(h,'text/html');var pageItems=p(doc);if(pageItems.length===0)break;all=all.concat(pageItems);}catch(err){console.error(err);break;}await new Promise(function(res){setTimeout(res,250);});}document.body.removeChild(box);}if(all.length>0){var s=JSON.stringify(all);var done=function(){alert('Copied '+all.length+' Tsumego Hero solves to clipboard! Paste into tsumestats.')};if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(s);done();}else{var ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}}else{alert('No solve records found.');}}catch(e){alert('Scrape failed: '+e.message);}})();`;

  let currentBookmarklet = $derived(isWeiqi ? WEIQI_BOOKMARKLET : HERO_BOOKMARKLET);

  function executeImport(content: string, fileName?: string) {
    importError = null;
    importSuccess = null;

    // Detect if content is Tsumego Hero vs 101weiqi
    const trimmed = content.trim();
    const isHeroContent =
      trimmed.includes('<table') ||
      trimmed.includes('solveHistory') ||
      trimmed.includes('"misplays"') ||
      trimmed.includes('"set"');

    try {
      if (isHeroContent) {
        const res = heroStore.importRecords(content);
        platformStore.setPlatform('tsumegohero');
        importSuccess = `Successfully imported ${res.total} Tsumego Hero solves${fileName ? ` from ${fileName}` : ''} (${res.added} new solves merged)!`;
      } else {
        const res = recordsStore.importRecords(content);
        platformStore.setPlatform('101weiqi');
        importSuccess = `Successfully imported ${res.total} 101weiqi test records${fileName ? ` from ${fileName}` : ''} (${res.added} new records merged)!`;
      }
      jsonText = '';
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: unknown) {
      importError = e instanceof Error ? e.message : 'Invalid import data format.';
    }
  }

  function handlePasteImport() {
    if (!jsonText.trim()) {
      importError = 'Please paste a JSON array or HTML string.';
      return;
    }
    executeImport(jsonText);
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      executeImport(content, file.name);
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
    navigator.clipboard.writeText(currentBookmarklet);
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
          <div class="w-7 h-7 rounded-lg {isWeiqi ? 'bg-[#88C13F]' : 'bg-[#8052cf]'} text-white flex items-center justify-center font-bold text-sm shadow-xs transition-colors">
            詰
          </div>
          <div>
            <h2 class="text-base font-bold text-[#3D2A1F]">
              {isWeiqi ? '101weiqi' : 'Tsumego Hero'} Data Import & Bookmarklet
            </h2>
          </div>
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
          class="px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer {activeTab === 'import' ? (isWeiqi ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-[#8052cf] text-[#3D2A1F]') : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
        >
          <span class="flex items-center gap-1.5">
            <Upload class="w-3.5 h-3.5" />
            Paste JSON / Upload File
          </span>
        </button>
        <button
          onclick={() => (activeTab = 'bookmarklet')}
          class="px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer {activeTab === 'bookmarklet' ? (isWeiqi ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-[#8052cf] text-[#3D2A1F]') : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
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
              Your problem history is parsed and stored exclusively inside your browser (<code class="bg-[#FAF0DA] px-1 py-0.5 rounded text-[#8B5E3C]">localStorage</code>). Nothing is ever sent to a server, tracked, or stored anywhere on the internet.
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
            class="border-2 border-dashed rounded-xl p-5 text-center transition-colors {isDragging ? (isWeiqi ? 'border-[#88C13F] bg-[#eaf6dc]' : 'border-[#8052cf] bg-[#f3e8ff]') : 'border-[#D6BA96] bg-[#FAF0DA]/40 hover:bg-[#FAF0DA]'}"
          >
            <FileJson class="w-8 h-8 text-[#8B5E3C] mx-auto mb-2" />
            <p class="text-xs font-bold text-[#3D2A1F]">
              Drag and drop your {isWeiqi ? '101weiqi' : 'Tsumego Hero'} JSON or HTML file here
            </p>
            <p class="text-[11px] text-[#5e4537] mt-0.5">
              Supports .json exports and saved Tsumego Hero .html pages
            </p>
            <label class="mt-3 inline-block">
              <span class="px-3 py-1.5 bg-[#8B5E3C] hover:bg-[#6e472a] text-white font-medium text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
                Browse File
              </span>
              <input
                type="file"
                accept=".json,.html,application/json,text/html"
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
              Data String (from bookmarklet clipboard):
            </label>
            <textarea
              id="json-input"
              bind:value={jsonText}
              rows="6"
              placeholder={isWeiqi ? `[\n  {\n    "t": 1783461970,\n    "status": 1,\n    "oknum": 6,\n    "totaltime": 292,\n    "guanid": 9903229,\n    "number": 6\n  }\n]` : `[\n  {\n    "set": "Korean Problem Academy 1",\n    "tsumego": "42",\n    "misplays": 0,\n    "rating": 1865,\n    "xp": 11,\n    "date": "2026-09-18 12:44:11"\n  }\n]`}
              class="w-full text-xs font-mono p-3 bg-[#FAF0DA] border border-[#D6BA96] rounded-xl text-[#3D2A1F] placeholder-[#5e4537]/50 focus:outline-none focus:ring-2 {isWeiqi ? 'focus:ring-[#88C13F]' : 'focus:ring-[#8052cf]'}"
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
              class="px-5 py-2 text-xs font-bold {isWeiqi ? 'bg-[#88C13F] hover:bg-[#78ab37]' : 'bg-[#8052cf] hover:bg-[#6f42b8]'} text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload class="w-3.5 h-3.5" />
              Import Records
            </button>
          </div>
        {:else}
          <!-- Bookmarklet Guide Tab -->
          <div class="space-y-4 text-xs text-[#3D2A1F]">
            <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4">
              <h3 class="font-bold text-sm text-[#3D2A1F] mb-1">
                How to copy your {isWeiqi ? '101weiqi' : 'Tsumego Hero'} solve history
              </h3>
              <p class="text-[11px] text-[#5e4537] leading-relaxed">
                {#if isWeiqi}
                  101weiqi stores your checkpoint history in an internal JavaScript variable (<code class="bg-[#FDF5E6] px-1 py-0.5 rounded text-[#8B5E3C]">records</code>). This bookmarklet copies all test records to your clipboard in 1 click.
                {:else}
                  Tsumego Hero stores your complete solve logs under <strong>Solve History</strong> (<code class="bg-[#FDF5E6] px-1 py-0.5 rounded text-[#8B5E3C]">/users/solveHistory/...</code>). This bookmarklet automatically fetches all pages in the background and copies the full history to your clipboard with 1 click!
                {/if}
              </p>
            </div>

            <!-- Step 1 -->
            <div class="space-y-2">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">1</span>
                <span>Copy the 1-Click Bookmarklet Code</span>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  value={currentBookmarklet}
                  class="grow text-[11px] font-mono p-2 bg-[#FAF0DA] border border-[#D6BA96] rounded-lg text-[#5e4537] truncate focus:outline-none"
                />
                <button
                  onclick={copyBookmarklet}
                  class="px-3 py-2 {isWeiqi ? 'bg-[#88C13F] hover:bg-[#78ab37]' : 'bg-[#8052cf] hover:bg-[#6f42b8]'} text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
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
                Bookmark any page in your browser (e.g. press <kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Ctrl+D</kbd> or <kbd class="px-1 border border-[#D6BA96] rounded bg-[#FAF0DA]">Cmd+D</kbd>). Name it <strong>"Copy {isWeiqi ? '101weiqi' : 'Tsumego Hero'} History"</strong>, and paste the copied code into the <strong>URL / Location</strong> field.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="space-y-1">
              <div class="font-bold flex items-center gap-2 text-[#8B5E3C]">
                <span class="w-5 h-5 rounded-full bg-[#8B5E3C] text-white text-[10px] flex items-center justify-center font-black">3</span>
                <span>Click on Your {isWeiqi ? '101weiqi' : 'Tsumego Hero'} Page</span>
              </div>
              <p class="text-[11px] text-[#5e4537] ml-7">
                {#if isWeiqi}
                  Go to your <a href="https://www.101weiqi.com/guan/my/" target="_blank" rel="noopener noreferrer" class="text-[#8B5E3C] underline font-semibold">101weiqi test history (https://www.101weiqi.com/guan/my/)</a>. Click your bookmark! All records are copied to your clipboard.
                {:else}
                  Go to your <a href="https://tsumego.com" target="_blank" rel="noopener noreferrer" class="text-[#8052cf] underline font-semibold">Tsumego Hero profile</a> and open <strong>Solve History</strong> (<code class="bg-[#FAF0DA] px-1 py-0.5 rounded">/users/solveHistory/...</code>). Click your bookmark! It will scrape all pages in ~1 second and copy the full JSON to your clipboard.
                {/if}
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
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
