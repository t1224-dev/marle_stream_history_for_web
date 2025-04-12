// メインのJavaScriptコードはここに記述 

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('app-content');
    const navItems = document.querySelectorAll('.nav-item');

    // データ格納用の変数
    let allVideos = [];

    // ブラウザの戻る・進むボタンに対応
    window.addEventListener('popstate', (event) => {
        console.log('popstate イベント発生:', event.state);
        
        // 履歴の状態に基づいて画面を更新
        const state = event.state;
        
        // 空のstate時の処理を改善
        if (!state) {
            // URLハッシュから判断
            const hash = window.location.hash;
            if (hash) {
                handleUrlHashChange();
            } else {
                // ハッシュもないなら、ホームに戻る
                navItems.forEach(nav => nav.classList.remove('active'));
                const homeNav = document.querySelector('.nav-item[data-page="home"]');
                if (homeNav) homeNav.classList.add('active');
                loadPage('home', { isHistoryNav: true });
            }
            return;
        }
        
        // 通常の履歴状態処理
        if (state.page === 'video-detail' && state.videoId) {
            // 詳細ページへの遷移
            // ここで重要なのは、fromPage 情報を保持すること
            loadPage('video-detail', { 
                videoId: state.videoId, 
                fromPage: state.fromPage || 'home', 
                isHistoryNav: true 
            });
        } else {
            // ナビゲーションアイテムをアクティブに
            navItems.forEach(nav => nav.classList.remove('active'));
            const navItem = document.querySelector(`.nav-item[data-page="${state.page}"]`);
            if (navItem) navItem.classList.add('active');
            
            // 通常ページへの遷移
            loadPage(state.page, { isHistoryNav: true });
        }
    });

    // URLハッシュの変更を処理する関数
    function handleUrlHashChange() {
        const hash = window.location.hash;
        if (hash) {
            const hashParts = hash.substring(1).split('?');
            const page = hashParts[0];
            
            // ビデオ詳細ページの場合
            if (page === 'video-detail' && hashParts.length > 1) {
                const params = new URLSearchParams(hashParts[1]);
                const videoId = params.get('id');
                if (videoId) {
                    loadPage('video-detail', { videoId, fromPage: 'home', isHistoryNav: true });
                    return;
                }
            }
            
            // 通常のページ遷移
            const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
            if (navItem) {
                navItems.forEach(nav => nav.classList.remove('active'));
                navItem.classList.add('active');
                loadPage(page, { isHistoryNav: true });
                return;
            }
        } else {
            // ハッシュがない場合はホーム画面に
            loadPage('home', { isHistoryNav: true });
        }
    }

    // --- Data Loading ---
    async function loadVideoData() {
        try {
            console.log('動画データの読み込みを開始します...');
            const response = await fetch('assets/data/videos.json', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // レスポンステキストを取得
            const text = await response.text();
            
            try {
                // テキストからJSONを解析
                allVideos = JSON.parse(text);
                console.log('動画データを読み込みました:', allVideos.length + '件');
                // JSON読み込み後に初期ページ読み込みを実行
                initializeAppUI();
            } catch (parseError) {
                console.error('JSONの解析に失敗しました:', parseError);
                console.log('受信したJSONの一部:', text.substring(0, 500) + '...');
                content.innerHTML = '<p>動画データの解析に失敗しました。</p>';
            }
        } catch (error) {
            console.error('動画データの読み込みに失敗しました:', error);
            content.innerHTML = '<p>動画データの読み込みに失敗しました。</p>';
        }
    }

    // --- Page Loading Logic ---
    async function loadPage(pageName, options = {}) {
        try {
            // 詳細ページの場合
            if (pageName === 'video-detail') {
                if (!options.videoId) {
                    console.error('動画IDが指定されていません。');
                    return;
                }
                
                const response = await fetch(`pages/${pageName}.html`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const pageHtml = await response.text();
                content.innerHTML = pageHtml;
                content.dataset.currentPage = pageName;
                
                // 履歴の更新（履歴ナビゲーションでない場合のみ）
                if (!options.isHistoryNav) {
                    const newUrl = `#video-detail?id=${options.videoId}`;
                    const historyState = { 
                        page: 'video-detail', 
                        videoId: options.videoId,
                        fromPage: options.fromPage || 'home'
                    };
                    window.history.pushState(historyState, '', newUrl);
                }
                
                // video-detail.jsの読み込みを確認
                if (typeof window.initVideoDetailPage === 'function') {
                    window.initVideoDetailPage(options.videoId, options.fromPage || 'home');
                } else {
                    console.error('動画詳細機能の初期化に失敗しました。video-detail.jsが読み込まれていることを確認してください。');
                }
                
                return;
            }

            // 通常のページ読み込み
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const pageHtml = await response.text();
            content.innerHTML = pageHtml;
            content.dataset.currentPage = pageName; // 現在のページ名を記録
            console.log(`${pageName} ページを読み込みました`);
            
            // 履歴の更新（履歴ナビゲーションでない場合のみ）
            if (!options.isHistoryNav) {
                const newUrl = `#${pageName}`;
                const historyState = { page: pageName };
                window.history.pushState(historyState, '', newUrl);
            }

            // ページ固有の初期化処理を実行
            if (pageName === 'home') {
                initHomePage();
            } else if (pageName === 'calendar') {
                // グローバルスコープの initCalendarPage を呼び出す
                if (typeof initCalendarPage === 'function') {
                    initCalendarPage(allVideos, displayVideos, createVideoCard);
                } else {
                    console.error('initCalendarPage 関数が見つかりません。calendar.js は読み込まれていますか？');
                }
            } else if (pageName === 'search') {
                // 検索ページの初期化
                if (typeof window.initSearchPage === 'function') {
                    window.initSearchPage();
                } else {
                    console.error('initSearchPage 関数が見つかりません。search.js は読み込まれていますか？');
                }
            }
        } catch (error) {
            console.error(`${pageName} ページの読み込みに失敗しました:`, error);
            content.innerHTML = `<p>${pageName} ページの読み込みに失敗しました。</p>`;
        }
    }

    // --- Home Page Initialization ---
    function initHomePage() {
        console.log('ホーム画面の初期化を開始');
        const profileContainer = document.getElementById('profile-info');
        const recentVideosContainer = document.getElementById('recent-videos');

        if (!profileContainer || !recentVideosContainer) {
            console.error('ホーム画面の要素が見つかりません。');
            return;
        }

        // プロフィール情報の表示
        profileContainer.innerHTML = `
            <div class="profile-card">
                <img src="assets/data/images/icon/Marle_icon.jpg" alt="マール・アストレア" class="profile-icon">
                <h2>マール・アストレア</h2>
                <p>Virtual YouTuber</p>
                <p class="profile-description">
                    アストレア法国出身の21歳！歌とゲームが大好きです！また時々お絵描き配信もしています。よろしくお願いします！
                </p>
                <div class="profile-stats">
                    <div>
                        <span>配信数</span>
                        <strong>${allVideos.length}</strong>
                    </div>
                    <div>
                        <span>総再生回数</span>
                        <strong>${calculateTotalViews(allVideos)}</strong>
                    </div>
                     <div>
                        <span>活動開始日</span>
                        <strong>2023/10/11</strong>
                    </div>
                </div>
            </div>
        `;
        console.log('プロフィール情報を表示しました');

        // 最近の動画リストの表示
        const recentVideos = getRecentVideos(allVideos, 6);
        displayVideos(recentVideos, recentVideosContainer);
        console.log('最近の動画を表示しました');
    }

    // --- Utility Functions (Shared) ---
    function calculateTotalViews(videos) {
        const total = videos.reduce((sum, video) => sum + (video.viewCount || 0), 0);
        if (total >= 10000) {
            return (total / 10000).toFixed(1) + '万';
        }
        return total.toLocaleString();
    }

    function getRecentVideos(videos, count) {
        // publishedAtで降順ソート (エラーハンドリング追加)
        const sortedVideos = videos
            .filter(v => v.publishedAt) // publishedAt が存在する動画のみフィルタリング
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        return sortedVideos.slice(0, count);
    }

    function displayVideos(videos, container) {
        if (!container) {
             console.warn("displayVideos: containerが見つかりません。");
             return;
        }
        container.innerHTML = '';
        if (!videos || videos.length === 0) {
            // videosが空の場合の処理（オプション）
            // container.innerHTML = '<p>表示する動画がありません。</p>';
            return;
        }
        videos.forEach(video => {
            try {
                const videoCard = createVideoCard(video);
                container.appendChild(videoCard);
            } catch (error) {
                 console.error(`動画カードの作成中にエラーが発生しました (動画ID: ${video?.id}):`, error);
            }
        });
    }

    function createVideoCard(video) {
        const card = document.createElement('div');
        card.classList.add('video-card');
        card.dataset.videoId = video.id;

        // publishedAt の存在と形式をチェック
        let publishedDate, timeAgo = '-';
        if (video.publishedAt && typeof video.publishedAt === 'string') {
            try {
                 publishedDate = new Date(video.publishedAt);
                 if (!isNaN(publishedDate.getTime())) {
                     timeAgo = calculateTimeAgo(publishedDate);
                 } else {
                     console.warn(`動画ID ${video.id} の publishedAt (${video.publishedAt}) から有効な日付を作成できませんでした。`);
                     publishedDate = null; // 無効な日付の場合はnullに
                 }
            } catch (e) {
                 console.error(`動画ID ${video.id} の日付処理中にエラー:`, e);
                 publishedDate = null;
            }
        } else {
             console.warn(`動画ID ${video.id} に有効な publishedAt がありません。`);
        }

        // 日付表示用の文字列を生成 (UTC基準)
        let displayDateString = '日付不明';
        if (publishedDate) {
            try {
                const year = publishedDate.getUTCFullYear();
                const month = (publishedDate.getUTCMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
                const day = publishedDate.getUTCDate().toString().padStart(2, '0');
                displayDateString = `${year}/${month}/${day}`;
            } catch (e) {
                 console.error(`動画ID ${video.id} のUTC日付文字列生成中にエラー:`, e);
            }
        }

        const thumbnailPath = video.thumbnailPath
            ? `assets/data/${video.thumbnailPath}`
            : 'assets/data/images/icon/not_found.jpg';

        card.innerHTML = `
            <div class="video-thumbnail">
                 <img src="${thumbnailPath}" alt="${video.title || 'タイトルなし'}" onerror="this.onerror=null; this.src='assets/data/images/icon/not_found.jpg'">
                 <span class="video-duration">${formatDuration(video.duration)}</span>
                 <span class="video-time-ago">${timeAgo}</span>
            </div>
            <div class="video-info">
                 <h4>${video.title || 'タイトルなし'}</h4>
                 <div class="video-stats">
                     <span><i class="fas fa-eye"></i> ${formatViewCount(video.viewCount)} 回視聴</span>
                     <span><i class="fas fa-calendar-alt"></i> ${displayDateString}</span>
                 </div>
                 <div class="video-tags">
                     ${(video.tags || []).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                 </div>
            </div>
        `;
        
        // 動画カードのクリックイベントハンドラ
        card.addEventListener('click', () => {
            const currentPage = content.dataset.currentPage || 'home';
            loadPage('video-detail', { videoId: video.id, fromPage: currentPage });
            // URLハッシュの直接変更は不要（loadPage内で処理される）
        });
        
        return card;
    }

    function formatViewCount(count) {
        if (count === null || typeof count === 'undefined') return '-';
        if (count >= 10000) {
            return (count / 10000).toFixed(1) + '万';
        }
        return count.toLocaleString();
    }

    function formatDuration(duration) {
        if (!duration || duration === 'P0D') return '';
        try {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) {
                 const parts = duration.split(':');
                 if (parts.length === 3) {
                    const h = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    const s = parseInt(parts[2], 10);
                    if (isNaN(h) || isNaN(m) || isNaN(s)) return ''; // パース失敗
                    if (h > 0) {
                        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    } else {
                        return `${m}:${s.toString().padStart(2, '0')}`;
                    }
                 } else if (parts.length === 2) {
                     const m = parseInt(parts[0], 10);
                     const s = parseInt(parts[1], 10);
                     if (isNaN(m) || isNaN(s)) return ''; // パース失敗
                     return `${m}:${s.toString().padStart(2, '0')}`;
                 }
                 return ''; // 不明なフォーマット
            }

            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2] || '0', 10);
            const seconds = parseInt(match[3] || '0', 10);

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (e) {
            console.error("Duration format error:", e);
            return ''; // エラー時は空文字
        }
    }

    function calculateTimeAgo(date) {
        try {
            const now = new Date();
            const diff = now.getTime() - date.getTime();
             if (isNaN(diff)) return '-'; // 無効な日付の場合

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (years > 0) return `${years}年前`;
            if (months > 0) return `${months}ヶ月前`;
            if (days > 0) return `${days}日前`;
            if (hours > 0) return `${hours}時間前`;
            if (minutes > 0) return `${minutes}分前`;
             if (seconds < 0) return '未来'; // 未来の日付の場合
            return `${seconds}秒前`;
        } catch (e) {
             console.error("calculateTimeAgo error:", e);
             return '-';
        }
    }

    // --- Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (!page) return; // data-pageがない場合は無視

            // アクティブなナビゲーション項目を更新
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 対応するページを読み込む
            loadPage(page);
        });
    });

    // ページ内リンク（全て見るなど）のクリックイベント
    document.addEventListener('click', (e) => {
        // a要素でdata-page属性を持つものを対象にする
        if (e.target.matches('a[data-page]') || e.target.closest('a[data-page]')) {
            e.preventDefault();
            const link = e.target.matches('a[data-page]') ? e.target : e.target.closest('a[data-page]');
            const page = link.dataset.page;
            
            // フッターメニューをアクティブに
            navItems.forEach(nav => {
                if (nav.dataset.page === page) {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });
            
            // ページを読み込む
            loadPage(page);
        }
    });

    // --- Initialization ---
    function initializeAppUI() {
        // URLハッシュがある場合は対応するページを表示
        const hash = window.location.hash;
        if (hash) {
            handleUrlHashChange();
        } else {
            // デフォルトでホーム画面を表示し、初期状態を履歴に追加
            const initialPage = 'home';
            const homeNavItem = document.querySelector(`.nav-item[data-page="${initialPage}"]`);
            if (homeNavItem) {
                homeNavItem.classList.add('active');
            }
            
            // 最初のページのみreplaceStateを使う（追加ではなく置き換え）
            window.history.replaceState({ page: initialPage }, '', `#${initialPage}`);
            loadPage(initialPage);
        }
    }

    // Start data loading, which will trigger UI initialization upon completion
    loadVideoData();

    // グローバルスコープに関数をエクスポート
    window.createVideoCard = createVideoCard;
    window.loadPage = loadPage;
}); 