<script lang="ts">
  import { platformStore } from '$lib/stores/platform.svelte';
  import { recordsStore } from '$lib/stores/records.svelte';
  import { heroStore } from '$lib/stores/heroRecords.svelte';
  import { extractHeroUserId, parseHeroHtmlWithPagination } from '$lib/utils/heroRecords';
  import type { HeroRawRecord } from '$lib/types';
  import {
    X,
    Upload,
    FileJson,
    Bookmark,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    Zap,
    ExternalLink,
    Loader2,
    Server,
    ChevronDown,
    ChevronUp
  } from 'lucide-svelte';

  type TabType = 'direct' | 'bookmarklet' | 'import';

  interface Props {
    open: boolean;
    initialTab?: TabType;
    onClose: () => void;
  }

  let { open, initialTab, onClose }: Props = $props();

  let isWeiqi = $derived(platformStore.activePlatform === '101weiqi');

  let activeTab = $state<TabType>('direct');
  let jsonText = $state('');
  let importError = $state<string | null>(null);
  let importSuccess = $state<string | null>(null);
  let copiedBookmarklet = $state(false);
  let isDragging = $state(false);

  // Direct scraper states for Tsumego Hero
  let profileInput = $state('');
  let isFetching = $state(false);
  let fetchProgress = $state({ current: 0, total: 1, solvesCount: 0 });
  let fetchStatus = $state<string | null>(null);
  let fetchError = $state<string | null>(null);
  let fetchedSolves = $state<HeroRawRecord[]>([]);
  let abortController = $state<AbortController | null>(null);
  let showProxyHelp = $state(false);
  let showNginxSnippet = $state(false);

  let detectedUserId = $derived(extractHeroUserId(profileInput));

  // Sync activeTab and prefill user ID when modal opens
  $effect(() => {
    if (open) {
      if (isWeiqi) {
        activeTab = initialTab === 'bookmarklet' ? 'bookmarklet' : 'import';
      } else {
        activeTab = initialTab ?? 'direct';
      }
      importError = null;
      importSuccess = null;
      fetchError = null;
      fetchStatus = null;
      showProxyHelp = false;

      // Prefill last used Tsumego Hero user ID from localStorage if empty
      if (!profileInput && typeof localStorage !== 'undefined') {
        const savedId = localStorage.getItem('tsumestats_hero_user_id');
        if (savedId) {
          profileInput = savedId;
        }
      }
    }
  });

  const WEIQI_BOOKMARKLET = `javascript:(function(){try{if(typeof records!=='undefined'&&Array.isArray(records)){var s=JSON.stringify(records);var done=function(){alert('Copied '+records.length+' 101weiqi test records to clipboard! Paste into tsumestats.')};var fb=function(){var t=document.createElement('textarea');t.value=s;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.focus();t.select();var ok=document.execCommand('copy');document.body.removeChild(t);return ok;};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(done).catch(function(){if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s)}});}else if(fb()){done()}else{prompt('Press Ctrl+C to copy records:',s);}}else{alert('101weiqi records variable not found. Please navigate to https://www.101weiqi.com/guan/my/ first.');}}catch(e){alert('Copy failed: '+e.message);}})();`;

  const HERO_BOOKMARKLET = `javascript:(async function(){try{var t=document.querySelectorAll('table')[1]||document.querySelector('table.data-table')||document.querySelector('table');if(!t){alert('Please navigate to your Tsumego Hero Solve History page (/users/solveHistory/...) first.');return;}function p(d){var table=d.querySelector('table.data-table')||(d.querySelectorAll('table')[1]||d.querySelector('table'));var rows=table?table.querySelectorAll('tr'):[];var it=[];for(var i=1;i<rows.length;i++){var c=rows[i].querySelectorAll('td');if(c.length>=7){var aS=c[0].querySelector('a');var aP=c[1].querySelector('a');var sN=c[0].textContent.trim();var numEl=c[1].querySelector('.problem-nav__number');var pR=numEl?numEl.textContent.trim():c[1].textContent.trim().split('-')[0].trim();var dS=c[6].textContent.trim();if(sN&&pR&&dS){it.push({set:sN,setUrl:aS?aS.getAttribute('href'):null,tsumego:pR,probUrl:aP?aP.getAttribute('href'):null,solved:c[2].textContent.trim()==='✓',misplays:parseInt(c[3].textContent.trim(),10)||0,rating:parseInt(c[4].textContent.trim(),10)||0,xp:parseInt(c[5].textContent.trim(),10)||0,date:dS});}}}return it;}var all=p(document);var totalPages=1;var curPage=1;var infoEl=document.querySelector('.pagination__info');if(infoEl){var cm=infoEl.textContent.match(/Page\\s+(\\d+)\\s+of\\s+(\\d+)/i);if(cm){curPage=parseInt(cm[1],10)||1;totalPages=parseInt(cm[2],10)||1;}else{var om=infoEl.textContent.match(/of\\s+(\\d+)/i);if(om)totalPages=parseInt(om[1],10)||1;}}else{var pLinks=Array.from(document.querySelectorAll('a[href*="page="]'));for(var i=0;i<pLinks.length;i++){var pm=pLinks[i].href.match(/page=(\\d+)/);if(pm){var pN=parseInt(pm[1],10);if(pN>totalPages)totalPages=pN;}}}if(totalPages>50)totalPages=50;var cancelled=false;if(totalPages>1){var box=document.createElement('div');box.style.cssText='position:fixed;top:20px;right:20px;background:#FAF0DA;color:#3D2A1F;padding:14px 18px;border-radius:12px;font-family:sans-serif;font-size:12px;z-index:9999999;box-shadow:0 8px 24px rgba(61,42,31,0.3);border:2px solid #8052cf;min-width:260px;';var titleDiv=document.createElement('div');titleDiv.style.cssText='font-weight:bold;font-size:13px;margin-bottom:6px;display:flex;align-items:center;gap:6px;';titleDiv.innerHTML='<span style="color:#8052cf">●</span> Tsumego Hero Scraper';var statusDiv=document.createElement('div');statusDiv.style.cssText='color:#5e4537;margin-bottom:10px;line-height:1.4;';statusDiv.textContent='Page '+curPage+' of '+totalPages+' ('+all.length+' solves)...';var btnRow=document.createElement('div');btnRow.style.cssText='display:flex;justify-content:flex-end;gap:6px;';var cancelBtn=document.createElement('button');cancelBtn.style.cssText='background:#fbeee9;color:#c84b31;border:1px solid rgba(200,75,49,0.4);padding:5px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;';cancelBtn.textContent='Cancel';cancelBtn.onclick=function(){cancelled=true;cancelBtn.textContent='Stopping...';};var stopBtn=document.createElement('button');stopBtn.style.cssText='background:#8052cf;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer;';stopBtn.textContent='Stop & Copy';stopBtn.onclick=function(){cancelled=true;stopBtn.textContent='Copying...';};btnRow.appendChild(cancelBtn);btnRow.appendChild(stopBtn);box.appendChild(titleDiv);box.appendChild(statusDiv);box.appendChild(btnRow);document.body.appendChild(box);for(var pg=1;pg<=totalPages;pg++){if(cancelled)break;if(pg===curPage)continue;statusDiv.textContent='Fetching page '+pg+' of '+totalPages+' ('+all.length+' solves)...';try{var r=await fetch('?page='+pg);if(!r.ok)break;var h=await r.text();var pr=new DOMParser();var doc=pr.parseFromString(h,'text/html');var pageItems=p(doc);if(pageItems.length===0)break;all=all.concat(pageItems);}catch(err){console.error(err);break;}await new Promise(function(res){setTimeout(res,200);});}document.body.removeChild(box);}if(all.length>0){var s=JSON.stringify(all);var done=function(){alert('Copied '+all.length+' Tsumego Hero solves to clipboard! Paste into tsumestats.')};if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(s);done();}else{var ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}}else{alert('No solve records found.');}}catch(e){alert('Scrape failed: '+e.message);}})();`;

  let currentBookmarklet = $derived(isWeiqi ? WEIQI_BOOKMARKLET : HERO_BOOKMARKLET);

  async function handleStartDirectFetch() {
    const userId = extractHeroUserId(profileInput);
    if (!userId) {
      fetchError = 'Please enter a valid Tsumego Hero profile URL or numeric user ID.';
      return;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tsumestats_hero_user_id', profileInput.trim());
      } catch (_) {}
    }

    isFetching = true;
    fetchError = null;
    importError = null;
    importSuccess = null;
    showProxyHelp = false;
    fetchedSolves = [];
    fetchProgress = { current: 0, total: 1, solvesCount: 0 };
    fetchStatus = `Connecting to Tsumego Hero for user ${userId}...`;

    abortController = new AbortController();
    const signal = abortController.signal;
    const allRecords: HeroRawRecord[] = [];

    try {
      // Fetch Page 1
      fetchStatus = `Fetching page 1...`;
      const res = await fetch(`/api/tsumego/users/solveHistory/${userId}?page=1`, { signal });
      if (!res.ok) {
        if (res.status === 404 || res.status === 502) {
          showProxyHelp = true;
          throw new Error(
            `Direct proxy connection failed (HTTP ${res.status}). The /api/tsumego reverse proxy endpoint was not reachable.`
          );
        }
        throw new Error(`Failed to fetch solve history (HTTP ${res.status}: ${res.statusText})`);
      }

      const html = await res.text();
      const parsedFirstPage = parseHeroHtmlWithPagination(html);

      if (parsedFirstPage.records.length === 0) {
        throw new Error(
          `No solve records found for user ID "${userId}". Please verify that this user ID exists on Tsumego Hero.`
        );
      }

      allRecords.push(...parsedFirstPage.records);
      fetchedSolves = [...allRecords];

      let totalPages = parsedFirstPage.totalPages || 1;
      if (totalPages > 50) totalPages = 50; // Respectful safety cap

      fetchProgress = { current: 1, total: totalPages, solvesCount: allRecords.length };
      fetchStatus = `Fetched page 1 of ${totalPages} (${allRecords.length} solves)...`;

      // Fetch remaining pages if any
      for (let pg = 2; pg <= totalPages; pg++) {
        if (signal.aborted) break;

        // Respectful polite pause of 200ms
        await new Promise((r) => setTimeout(r, 200));
        if (signal.aborted) break;

        fetchStatus = `Fetching page ${pg} of ${totalPages} (${allRecords.length} solves)...`;
        const pRes = await fetch(`/api/tsumego/users/solveHistory/${userId}?page=${pg}`, { signal });
        if (!pRes.ok) {
          console.warn(`Page ${pg} fetch failed with HTTP ${pRes.status}, stopping pagination.`);
          break;
        }

        const pHtml = await pRes.text();
        const parsed = parseHeroHtmlWithPagination(pHtml);
        if (parsed.records.length === 0) {
          break;
        }

        allRecords.push(...parsed.records);
        fetchedSolves = [...allRecords];
        fetchProgress = { current: pg, total: totalPages, solvesCount: allRecords.length };
      }

      if (allRecords.length > 0) {
        const wasDemo = heroStore.isDemo;
        const result = heroStore.importRecords(allRecords);
        platformStore.setPlatform('tsumegohero');
        const detail = wasDemo ? 'demo dataset replaced' : `${result.added} new solves merged`;
        importSuccess = `Successfully imported ${result.total} Tsumego Hero solves (${detail})!`;
        fetchStatus = `Complete! ${result.total} solves imported.`;
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        throw new Error('No solve records could be parsed.');
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        fetchStatus = 'Scraping stopped by user.';
      } else {
        console.error('Direct scrape error:', err);
        fetchError = e.message || 'Failed to fetch history from Tsumego Hero.';
        if (e.name === 'TypeError' || (e.message && e.message.includes('fetch'))) {
          showProxyHelp = true;
        }
      }
    } finally {
      isFetching = false;
      abortController = null;
    }
  }

  function handleStopAndImport() {
    if (abortController) {
      abortController.abort();
    }
    isFetching = false;
    if (fetchedSolves.length > 0) {
      const wasDemo = heroStore.isDemo;
      const result = heroStore.importRecords(fetchedSolves);
      platformStore.setPlatform('tsumegohero');
      const detail = wasDemo ? 'demo dataset replaced' : `${result.added} new solves merged`;
      importSuccess = `Imported ${result.total} Tsumego Hero solves (${detail})!`;
      fetchStatus = `Stopped by user. ${result.total} solves imported.`;
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }

  function handleCancelFetch() {
    if (abortController) {
      abortController.abort();
    }
    isFetching = false;
    fetchStatus = 'Scraping cancelled.';
    fetchedSolves = [];
  }

  function handleCloseModal() {
    if (isFetching && abortController) {
      abortController.abort();
      isFetching = false;
    }
    onClose();
  }

  function executeImport(content: string, fileName?: string) {
    importError = null;
    importSuccess = null;

    const trimmed = content.trim();
    const isHeroContent =
      trimmed.includes('<table') ||
      trimmed.includes('solveHistory') ||
      trimmed.includes('"misplays"') ||
      trimmed.includes('"set"');

    try {
      if (isHeroContent) {
        const wasDemo = heroStore.isDemo;
        const res = heroStore.importRecords(content);
        platformStore.setPlatform('tsumegohero');
        const detail = wasDemo ? 'demo dataset replaced' : `${res.added} new solves merged`;
        importSuccess = `Successfully imported ${res.total} Tsumego Hero solves${fileName ? ` from ${fileName}` : ''} (${detail})!`;
      } else {
        const wasDemo = recordsStore.isDemo;
        const res = recordsStore.importRecords(content);
        platformStore.setPlatform('101weiqi');
        const detail = wasDemo ? 'demo dataset replaced' : `${res.added} new records merged`;
        importSuccess = `Successfully imported ${res.total} 101weiqi test records${fileName ? ` from ${fileName}` : ''} (${detail})!`;
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
              {isWeiqi ? '101weiqi' : 'Tsumego Hero'} Data Import
            </h2>
          </div>
        </div>
        <button
          onclick={handleCloseModal}
          class="p-1.5 rounded-lg text-[#5e4537] hover:bg-[#F4E7CE] hover:text-[#3D2A1F] transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tab Switcher -->
      <div class="flex border-b border-[#D6BA96] bg-[#FAF0DA]/50 px-4 pt-2 overflow-x-auto">
        {#if !isWeiqi}
          <!-- Tsumego Hero Tab 1: 1-Click Direct Scraper -->
          <button
            onclick={() => (activeTab = 'direct')}
            class="px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 {activeTab === 'direct' ? 'border-[#8052cf] text-[#3D2A1F]' : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
          >
            <Zap class="w-3.5 h-3.5 text-[#8052cf]" />
            <span>Direct Scraper</span>
            <span class="text-[10px] px-1.5 py-0.2 bg-[#8052cf]/10 text-[#8052cf] rounded-full font-bold">1-Click</span>
          </button>
        {/if}

        {#if !isWeiqi}
          <!-- Tsumego Hero Tab 2: Bookmarklet -->
          <button
            onclick={() => (activeTab = 'bookmarklet')}
            class="px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 {activeTab === 'bookmarklet' ? 'border-[#8052cf] text-[#3D2A1F]' : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
          >
            <Bookmark class="w-3.5 h-3.5" />
            <span>Bookmarklet</span>
          </button>
        {/if}

        <!-- Paste JSON / Upload File Tab (Primary for 101weiqi, Tab 3 for Tsumego Hero) -->
        <button
          onclick={() => (activeTab = 'import')}
          class="px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 {activeTab === 'import' ? (isWeiqi ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-[#8052cf] text-[#3D2A1F]') : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
        >
          <Upload class="w-3.5 h-3.5" />
          <span>Paste JSON / Upload File</span>
        </button>

        {#if isWeiqi}
          <!-- 101weiqi Tab 2: Bookmarklet -->
          <button
            onclick={() => (activeTab = 'bookmarklet')}
            class="px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 {activeTab === 'bookmarklet' ? 'border-[#88C13F] text-[#3D2A1F]' : 'border-transparent text-[#5e4537] hover:text-[#3D2A1F]'}"
          >
            <Bookmark class="w-3.5 h-3.5" />
            <span>Bookmarklet & Guide</span>
          </button>
        {/if}
      </div>

      <!-- Modal Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        <!-- Privacy & Client-Side Notice -->
        <div class="bg-[#eaf6dc]/80 border border-[#88C13F]/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#3D2A1F] shadow-2xs">
          <ShieldCheck class="w-4 h-4 text-[#55821c] shrink-0 mt-0.5" />
          <div class="leading-relaxed">
            <span class="font-bold text-[#55821c]">100% Client-Side & Private:</span>
            <span class="text-[#5e4537]">
              Your problem history is stored exclusively inside your browser (<code class="bg-[#FAF0DA] px-1 py-0.5 rounded text-[#8B5E3C]">localStorage</code>). Nothing is ever saved or tracked on any external server.
            </span>
          </div>
        </div>

        {#if activeTab === 'direct'}
          <!-- ================= TAB 1: DIRECT SCRAPER ================= -->
          <div class="space-y-4">
            <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4">
              <h3 class="font-bold text-sm text-[#3D2A1F] mb-1 flex items-center gap-2">
                <Zap class="w-4 h-4 text-[#8052cf]" />
                Direct Solve History Scraper
              </h3>
              <p class="text-[11px] text-[#5e4537] leading-relaxed">
                Tsumego Hero solve history is publicly viewable. Enter your profile URL or numeric User ID below, and TsumeStats will fetch, paginate, and parse your complete solving history in seconds.
              </p>
            </div>

            <!-- Profile Input Form -->
            <div class="space-y-2">
              <label for="hero-profile-input" class="block text-xs font-bold text-[#3D2A1F]">
                Tsumego Hero Profile URL or User ID:
              </label>
              <div class="relative">
                <input
                  id="hero-profile-input"
                  type="text"
                  bind:value={profileInput}
                  placeholder="https://tsumego.com/users/view/32551 or 32551"
                  disabled={isFetching}
                  class="w-full text-xs font-mono px-3 py-2.5 bg-[#FAF0DA] border border-[#D6BA96] rounded-xl text-[#3D2A1F] placeholder-[#5e4537]/50 focus:outline-none focus:ring-2 focus:ring-[#8052cf] disabled:opacity-60"
                  onkeydown={(e) => {
                    if (e.key === 'Enter' && !isFetching && detectedUserId) {
                      handleStartDirectFetch();
                    }
                  }}
                />
              </div>

              <!-- Live ID Detection & Quick demo chip -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div>
                  {#if detectedUserId}
                    <div class="inline-flex items-center gap-1.5 text-[11px] text-[#55821c] font-medium">
                      <CheckCircle2 class="w-3.5 h-3.5 text-[#55821c]" />
                      <span>Detected ID: <strong>{detectedUserId}</strong></span>
                      <span class="text-[#D6BA96]">·</span>
                      <a
                        href="https://tsumego.com/users/solveHistory/{detectedUserId}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[#8052cf] hover:underline inline-flex items-center gap-0.5"
                      >
                        verify on tsumego.com <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                  {:else if profileInput.trim()}
                    <div class="inline-flex items-center gap-1.5 text-[11px] text-[#c84b31]">
                      <AlertCircle class="w-3.5 h-3.5" />
                      <span>Could not detect numeric ID. Example: <code>32551</code> or <code>https://tsumego.com/users/view/32551</code></span>
                    </div>
                  {:else}
                    <span class="text-[11px] text-[#5e4537]">
                      Paste your profile URL or numeric ID from your Tsumego Hero profile page.
                    </span>
                  {/if}
                </div>

                {#if !profileInput}
                  <button
                    type="button"
                    onclick={() => (profileInput = '32551')}
                    class="text-[11px] text-[#8052cf] hover:underline cursor-pointer bg-[#8052cf]/10 px-2 py-0.5 rounded-md"
                  >
                    Try sample ID: 32551
                  </button>
                {/if}
              </div>
            </div>

            <!-- Fetch Progress Box (when active) -->
            {#if isFetching}
              <div class="p-4 bg-[#FAF0DA] border border-[#8052cf]/50 rounded-xl space-y-3 shadow-2xs">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Loader2 class="w-4 h-4 text-[#8052cf] animate-spin shrink-0" />
                    <span class="text-xs font-bold text-[#3D2A1F]">{fetchStatus}</span>
                  </div>
                  {#if fetchProgress.total > 0}
                    <span class="text-xs font-mono font-bold text-[#8052cf]">
                      {Math.round((fetchProgress.current / Math.max(1, fetchProgress.total)) * 100)}%
                    </span>
                  {/if}
                </div>

                <!-- Animated Progress Bar -->
                <div class="w-full bg-[#D6BA96]/40 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="bg-[#8052cf] h-full transition-all duration-300 rounded-full"
                    style="width: {fetchProgress.total > 0 ? (fetchProgress.current / Math.max(1, fetchProgress.total)) * 100 : 5}%"
                  ></div>
                </div>

                <!-- Live Info & Action Controls -->
                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] text-[#5e4537]">
                    Page <strong>{fetchProgress.current}</strong> of <strong>{fetchProgress.total}</strong> · <strong>{fetchedSolves.length}</strong> solves retrieved
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      onclick={handleCancelFetch}
                      class="px-2.5 py-1 text-xs font-semibold text-[#c84b31] hover:bg-[#fbeee9] border border-[#c84b31]/40 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    {#if fetchedSolves.length > 0}
                      <button
                        onclick={handleStopAndImport}
                        class="px-3 py-1 text-xs font-bold bg-[#8052cf] hover:bg-[#6f42b8] text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Stop & Import ({fetchedSolves.length})
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}

            <!-- Feedback Messages -->
            {#if fetchError}
              <div class="p-3 bg-[#fbeee9] border border-[#c84b31]/40 rounded-xl text-xs text-[#c84b31] flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{fetchError}</span>
              </div>
            {/if}

            {#if importSuccess}
              <div class="p-3 bg-[#eaf6dc] border border-[#88C13F]/50 rounded-xl text-xs text-[#55821c] flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            {/if}

            <!-- Proxy Help Callout (shown if network error or 404 occurs) -->
            {#if showProxyHelp}
              <div class="p-3.5 bg-[#FAF0DA] border border-[#D6BA96] rounded-xl text-xs space-y-2.5">
                <div class="flex items-center gap-2 font-bold text-[#8B5E3C]">
                  <Server class="w-4 h-4 shrink-0" />
                  <span>Reverse Proxy Required for Direct Scraping</span>
                </div>
                <p class="text-[#5e4537] text-[11px] leading-relaxed">
                  Direct browser scraping uses the <code>/api/tsumego</code> path to bypass cross-origin browser restrictions (CORS).
                  If you haven't set up the Nginx proxy yet on your VPS, you can instantly use the <strong>Bookmarklet</strong> instead to scrape directly in your browser with zero setup.
                </p>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onclick={() => (activeTab = 'bookmarklet')}
                    class="px-3 py-1.5 bg-[#8052cf] text-white font-bold text-xs rounded-lg hover:bg-[#6f42b8] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Bookmark class="w-3.5 h-3.5" />
                    Switch to 1-Click Bookmarklet
                  </button>
                  <button
                    onclick={() => (showNginxSnippet = !showNginxSnippet)}
                    class="px-2.5 py-1.5 border border-[#D6BA96] text-[#5e4537] hover:text-[#3D2A1F] text-xs font-medium rounded-lg hover:bg-[#F4E7CE] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{showNginxSnippet ? 'Hide' : 'View'} Nginx config</span>
                    {#if showNginxSnippet}
                      <ChevronUp class="w-3.5 h-3.5" />
                    {:else}
                      <ChevronDown class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
                {#if showNginxSnippet}
                  <pre class="bg-[#3D2A1F] text-[#FAF0DA] p-3 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed mt-2">
# Add to your server block in /etc/nginx/sites-available/tsumestats:
location /api/tsumego/ &#123;
    proxy_pass https://tsumego.com/;
    proxy_ssl_server_name on;
    proxy_set_header Host tsumego.com;
    proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
&#125;</pre>
                {/if}
              </div>
            {/if}

            <!-- Action Buttons (when idle) -->
            {#if !isFetching}
              <div class="flex justify-end gap-2 pt-2">
                <button
                  onclick={handleCloseModal}
                  class="px-4 py-2 text-xs font-medium border border-[#D6BA96] bg-[#FAF0DA] hover:bg-[#F4E7CE] text-[#3D2A1F] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onclick={handleStartDirectFetch}
                  disabled={!detectedUserId}
                  class="px-5 py-2 text-xs font-bold bg-[#8052cf] hover:bg-[#6f42b8] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Zap class="w-3.5 h-3.5" />
                  Fetch Solves (1-Click)
                </button>
              </div>
            {/if}
          </div>
        {:else if activeTab === 'import'}
          <!-- ================= TAB 3: PASTE JSON / UPLOAD FILE ================= -->
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
              Supports .json exports and saved Tsumego Hero .html solve history pages
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
              Data String (from bookmarklet clipboard or export):
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
              onclick={handleCloseModal}
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
          <!-- ================= TAB 2: BOOKMARKLET GUIDE ================= -->
          <div class="space-y-4 text-xs text-[#3D2A1F]">
            <div class="bg-[#FAF0DA] border border-[#D6BA96] rounded-xl p-4">
              <h3 class="font-bold text-sm text-[#3D2A1F] mb-1">
                How to copy your {isWeiqi ? '101weiqi' : 'Tsumego Hero'} solve history
              </h3>
              <p class="text-[11px] text-[#5e4537] leading-relaxed">
                {#if isWeiqi}
                  101weiqi stores your checkpoint history in an internal JavaScript variable (<code class="bg-[#FDF5E6] px-1 py-0.5 rounded text-[#8B5E3C]">records</code>). This bookmarklet copies all test records to your clipboard in 1 click.
                {:else}
                  Tsumego Hero stores your complete solve logs under <strong>Solve History</strong> (<code class="bg-[#FDF5E6] px-1 py-0.5 rounded text-[#8B5E3C]">/users/solveHistory/...</code>). This bookmarklet automatically fetches all pages directly on tsumego.com and copies the full history to your clipboard with 1 click!
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
