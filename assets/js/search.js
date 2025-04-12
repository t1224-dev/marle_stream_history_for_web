// 検索関連の変数
let allVideos = [];
let allTags = new Set();
let selectedTags = new Set();
let currentSearchTerm = '';
let currentSortOption = 'date-desc';
let currentPage = 1;
const VIDEOS_PER_PAGE = 12; // 1ページあたりの表示件数

// グローバルスコープへエクスポートするための宣言
window.initSearchPage = initSearchPage;

// 検索画面の初期化
function initSearchPage() {
    console.log('Initializing search page...');
    try {
        // 動画データの読み込み
        loadVideoData()
            .then(data => {
                allVideos = data;
                // 全タグの抽出
                extractAllTags();
                // タグフィルターの生成
                generateTagFilters();
                // イベントリスナーの設定
                setupEventListeners();
                // 初期表示（すべての動画）
                updateSearchResults();
            })
            .catch(error => {
                console.error('動画データの読み込みに失敗しました。', error);
                const resultsElement = document.querySelector('#search-results');
                if (resultsElement) {
                    resultsElement.innerHTML = '<p class="error-message">動画データの読み込みに失敗しました。</p>';
                }
            });
    } catch (error) {
        console.error('検索画面の初期化中にエラーが発生しました。', error);
    }
}

// 動画データの読み込み
async function loadVideoData() {
    const response = await fetch('assets/data/videos.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// 全タグの抽出
function extractAllTags() {
    allTags.clear();
    allVideos.forEach(video => {
        if (video.tags && Array.isArray(video.tags)) {
            video.tags.forEach(tag => allTags.add(tag));
        }
    });
    console.log(`抽出されたタグ: ${allTags.size}個`);
}

// タグフィルターの生成
function generateTagFilters() {
    const tagListElement = document.querySelector('#tag-list');
    if (!tagListElement) return;

    // ローディングメッセージを削除
    tagListElement.innerHTML = '';

    // タグをソートしてアルファベット順に表示
    const sortedTags = Array.from(allTags).sort();

    sortedTags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';

        const tagInput = document.createElement('input');
        tagInput.type = 'checkbox';
        tagInput.id = `tag-${tag}`;
        tagInput.className = 'tag-checkbox';
        tagInput.dataset.tag = tag;

        const tagLabel = document.createElement('label');
        tagLabel.htmlFor = `tag-${tag}`;
        tagLabel.className = 'tag-label';
        tagLabel.textContent = tag;

        tagItem.appendChild(tagInput);
        tagItem.appendChild(tagLabel);
        tagListElement.appendChild(tagItem);

        // チェックボックスのイベントリスナー
        tagInput.addEventListener('change', handleTagChange);
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    // 検索フォームの送信イベント
    const searchForm = document.querySelector('#search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = document.querySelector('#search-input');
            currentSearchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
            updateSearchResults();
        });
    }

    // 並べ替えセレクトボックスの変更イベント
    const sortSelect = document.querySelector('#sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortOption = e.target.value;
            updateSearchResults();
        });
    }

    // クリアボタンのクリックイベント
    const clearButton = document.querySelector('#clear-filters');
    if (clearButton) {
        clearButton.addEventListener('click', clearAllFilters);
    }
}

// タグ選択時の処理
function handleTagChange(e) {
    const tag = e.target.dataset.tag;
    if (e.target.checked) {
        selectedTags.add(tag);
    } else {
        selectedTags.delete(tag);
    }
    updateSearchResults();
}

// フィルターをクリア
function clearAllFilters() {
    // 検索ワードをクリア
    const searchInput = document.querySelector('#search-input');
    if (searchInput) {
        searchInput.value = '';
        currentSearchTerm = '';
    }

    // 選択されたタグをクリア
    selectedTags.clear();
    const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
    tagCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // 並び替えを初期値に戻す
    const sortSelect = document.querySelector('#sort-by');
    if (sortSelect) {
        sortSelect.value = 'date-desc';
        currentSortOption = 'date-desc';
    }

    // 結果を更新
    updateSearchResults();
}

// 検索結果の更新
function updateSearchResults(page = 1) {
    const resultsElement = document.querySelector('#search-results');
    if (!resultsElement) return;

    currentPage = page; // 現在のページを更新

    // 検索条件に一致する動画をフィルタリング
    let filteredVideos = allVideos.filter(video => {
        // キーワード検索
        const matchesSearchTerm = currentSearchTerm === '' || 
            (video.title && video.title.toLowerCase().includes(currentSearchTerm)) || 
            (video.description && video.description.toLowerCase().includes(currentSearchTerm));

        // タグフィルタリング
        const matchesTags = selectedTags.size === 0 || 
            (video.tags && Array.isArray(video.tags) && 
             Array.from(selectedTags).every(tag => video.tags.includes(tag)));

        return matchesSearchTerm && matchesTags;
    });

    // 並び替え
    filteredVideos = sortVideos(filteredVideos);

    // 結果数の更新
    const resultCountElement = document.querySelector('#result-count');
    if (resultCountElement) {
        resultCountElement.textContent = `(${filteredVideos.length}件)`;
    }

    // 結果の表示
    if (filteredVideos.length === 0) {
        resultsElement.innerHTML = '<p class="no-results-message">検索条件に一致する動画がありません</p>';
    } else {
        // 検索結果コンテナをクリア
        resultsElement.innerHTML = '';

        // 動画表示用のコンテナ
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-grid';
        resultsElement.appendChild(videoContainer);
        
        // 現在のページの動画を表示
        const startIndex = (currentPage - 1) * VIDEOS_PER_PAGE;
        const endIndex = Math.min(startIndex + VIDEOS_PER_PAGE, filteredVideos.length);

        for (let i = startIndex; i < endIndex; i++) {
            const videoCard = createVideoCard(filteredVideos[i]);
            videoContainer.appendChild(videoCard);
        }

        // ページネーションコンテナを作成
        const paginationContainer = document.createElement('div');
        paginationContainer.style.width = '100%';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.marginTop = '2rem';
        resultsElement.appendChild(paginationContainer);

        // ページネーションの追加
        createPagination(filteredVideos.length, currentPage, paginationContainer);
    }
    
    // 検索結果の上部にスクロール（ページ遷移時）
    if (page > 1) {
        scrollToSearchResults();
    }
}

/**
 * 検索結果の上部にスクロールする
 */
function scrollToSearchResults() {
    // スクロール先のターゲット要素を取得
    const resultsContainer = document.querySelector('#search-results-section');
    if (!resultsContainer) return;
    
    // スクロール位置を計算（少し上にマージンを追加）
    const scrollOptions = {
        behavior: 'smooth',
        block: 'start',
    };
    
    // スクロール実行
    setTimeout(() => {
        resultsContainer.scrollIntoView(scrollOptions);
    }, 100); // 少し遅延させることでDOM更新後に確実にスクロールさせる
}

// 動画の並び替え
function sortVideos(videos) {
    return [...videos].sort((a, b) => {
        switch (currentSortOption) {
            case 'date-desc':
                return new Date(b.publishedAt) - new Date(a.publishedAt);
            case 'date-asc':
                return new Date(a.publishedAt) - new Date(b.publishedAt);
            case 'views-desc':
                const viewsA1 = getViewCount(a);
                const viewsB1 = getViewCount(b);
                return viewsB1 - viewsA1;
            case 'views-asc':
                const viewsA2 = getViewCount(a);
                const viewsB2 = getViewCount(b);
                return viewsA2 - viewsB2;
            case 'duration-desc':
                const durationA1 = getDurationSeconds(a.duration);
                const durationB1 = getDurationSeconds(b.duration);
                return durationB1 - durationA1;
            case 'duration-asc':
                const durationA2 = getDurationSeconds(a.duration);
                const durationB2 = getDurationSeconds(b.duration);
                return durationA2 - durationB2;
            default:
                return 0;
        }
    });
}

/**
 * 動画の再生回数を取得する（統一した形式で）
 * @param {Object} video - 動画オブジェクト
 * @returns {number} - 再生回数
 */
function getViewCount(video) {
    // viewCount または statistics.viewCount がある場合はそれを返す
    if (video.viewCount !== undefined) {
        return parseInt(video.viewCount) || 0;
    }
    
    if (video.statistics && video.statistics.viewCount !== undefined) {
        return parseInt(video.statistics.viewCount) || 0;
    }
    
    return 0;
}

/**
 * 動画の再生時間を秒数に変換する
 * @param {string} duration - ISO 8601形式またはHH:MM:SS形式の時間
 * @returns {number} - 秒数
 */
function getDurationSeconds(duration) {
    if (!duration) return 0;
    
    try {
        // ISO 8601形式（PT1H2M3S）の場合
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
            const hours = parseInt(match[1] || '0', 10);
            const minutes = parseInt(match[2] || '0', 10);
            const seconds = parseInt(match[3] || '0', 10);
            return hours * 3600 + minutes * 60 + seconds;
        }
        
        // HH:MM:SS または MM:SS 形式の場合
        const parts = duration.split(':');
        if (parts.length === 3) {
            // HH:MM:SS
            return parseInt(parts[0], 10) * 3600 + 
                   parseInt(parts[1], 10) * 60 + 
                   parseInt(parts[2], 10);
        } else if (parts.length === 2) {
            // MM:SS
            return parseInt(parts[0], 10) * 60 + 
                   parseInt(parts[1], 10);
        }
        
        return 0;
    } catch (e) {
        console.error('動画時間の解析に失敗しました:', e);
        return 0;
    }
}

// 動画カードの生成（app.jsと同じ関数を使用）
function createVideoCard(video) {
    // app.jsで定義されたcreateVideoCard関数を使用
    // この関数はapp.jsで読み込まれていることを前提としています
    if (typeof window.createVideoCard === 'function') {
        return window.createVideoCard(video);
    } else {
        console.error('createVideoCard関数が見つかりません。app.jsが正しく読み込まれていることを確認してください。');
        
        // 簡易的なカード生成（app.jsのcreateVideoCardが利用できない場合のフォールバック）
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="video-info">
                <h4>${video.title || 'タイトルなし'}</h4>
                <div class="video-stats">
                    <span><i class="fas fa-calendar"></i> ${new Date(video.publishedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        return card;
    }
}

/**
 * ページネーションを作成する
 * @param {number} totalVideos - 検索結果の総数
 * @param {number} currentPage - 現在のページ番号
 * @param {HTMLElement} container - ページネーションを追加する要素
 */
function createPagination(totalVideos, currentPage, container) {
    const totalPages = Math.ceil(totalVideos / VIDEOS_PER_PAGE);
    
    if (totalPages <= 1) {
        return; // ページネーションが不要な場合
    }
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // 前のページへのリンク
    if (currentPage > 1) {
        const prevBtn = document.createElement('a');
        prevBtn.href = '#';
        prevBtn.className = 'page-link nav-btn';
        prevBtn.textContent = '前へ';
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createRippleEffect(e); // リップルエフェクト追加
            updateSearchResults(currentPage - 1);
            scrollToSearchResults(); // スクロール処理を明示的に追加
        });
        pagination.appendChild(prevBtn);
    }
    
    // ページ番号
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('a');
        pageBtn.href = '#';
        pageBtn.className = 'page-link' + (i === currentPage ? ' active' : '');
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createRippleEffect(e); // リップルエフェクト追加
            
            // 現在と同じページでもスクロールだけは実行
            if (i === currentPage) {
                scrollToSearchResults();
            } else {
                updateSearchResults(i);
            }
        });
        pagination.appendChild(pageBtn);
    }
    
    // 次のページへのリンク
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('a');
        nextBtn.href = '#';
        nextBtn.className = 'page-link nav-btn';
        nextBtn.textContent = '次へ';
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createRippleEffect(e); // リップルエフェクト追加
            updateSearchResults(currentPage + 1);
            scrollToSearchResults(); // スクロール処理を明示的に追加
        });
        pagination.appendChild(nextBtn);
    }
    
    container.appendChild(pagination);
    
    // ページネーションボタンにリップルイベントリスナーを追加
    addRippleListenersToPageLinks();
}

/**
 * リップルエフェクトを作成する
 * @param {Event} e - クリックイベント
 */
function createRippleEffect(e) {
    const button = e.currentTarget;
    
    // 既存のリップルを削除
    const ripples = button.querySelectorAll('.ripple');
    ripples.forEach(ripple => ripple.remove());
    
    // リップルの位置を計算
    const buttonRect = button.getBoundingClientRect();
    const diameter = Math.max(buttonRect.width, buttonRect.height);
    const radius = diameter / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${e.clientX - buttonRect.left - radius}px`;
    ripple.style.top = `${e.clientY - buttonRect.top - radius}px`;
    
    // リップルを追加
    button.appendChild(ripple);
    
    // アニメーション終了後にリップルを削除
    setTimeout(() => {
        ripple.remove();
    }, 600); // アニメーション時間と一致
}

/**
 * 既存のページリンクにリップルイベントリスナーを追加
 */
function addRippleListenersToPageLinks() {
    const pageLinks = document.querySelectorAll('.page-link:not(.active)');
    pageLinks.forEach(link => {
        if (!link.getAttribute('data-has-ripple')) {
            link.setAttribute('data-has-ripple', 'true');
            link.addEventListener('click', createRippleEffect);
        }
    });
} 