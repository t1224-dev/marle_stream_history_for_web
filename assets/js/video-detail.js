// 動画詳細ページの処理
let detailPageVideos = [];
let currentVideoId = null;
let previousPage = 'home'; // デフォルトの戻り先

// 詳細画面の初期化
function initVideoDetailPage(videoId, fromPage = 'home') {
    console.log(`動画詳細画面を初期化: ID=${videoId}、遷移元=${fromPage}`);
    currentVideoId = videoId;
    previousPage = fromPage;
    
    // 戻るボタンのイベントリスナー設定
    setupBackButton();
    
    // 動画データの読み込み
    loadDetailVideos()
        .then(data => {
            detailPageVideos = data;
            displayVideoDetails(videoId);
        })
        .catch(error => {
            console.error('動画データの読み込みに失敗しました。', error);
            displayError('動画データの読み込みに失敗しました。');
        });
}

// 動画データの読み込み
async function loadDetailVideos() {
    const response = await fetch('assets/data/videos.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// 戻るボタンの設定
function setupBackButton() {
    // モバイル用の戻るボタン
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', handleBackButtonClick);
    }
    
    // PC用の戻るボタン
    const backButtonTop = document.getElementById('back-button-top');
    if (backButtonTop) {
        backButtonTop.addEventListener('click', handleBackButtonClick);
    }
}

// 戻るボタンのクリックイベントハンドラ
function handleBackButtonClick() {
    // ブラウザの戻るボタンと同じ動作にする
    window.history.back();
}

// 動画詳細の表示
function displayVideoDetails(videoId) {
    const video = detailPageVideos.find(v => v.id === videoId);
    if (!video) {
        displayError('動画が見つかりませんでした。');
        return;
    }
    
    // ローディング表示を非表示に
    const loadingElement = document.getElementById('video-loading');
    if (loadingElement) loadingElement.style.display = 'none';
    
    // コンテンツを表示
    const contentElement = document.getElementById('video-content');
    if (contentElement) contentElement.style.display = 'block';
    
    // サムネイル
    const thumbnailImg = document.getElementById('thumbnail-img');
    if (thumbnailImg) {
        const thumbnailPath = video.thumbnailPath
            ? `assets/data/${video.thumbnailPath}`
            : 'assets/data/images/icon/not_found.jpg';
        thumbnailImg.src = thumbnailPath;
        thumbnailImg.alt = video.title || '動画サムネイル';
    }
    
    // サムネイルのクリックイベント（YouTubeへリンク）
    const thumbnailContainer = document.getElementById('video-thumbnail');
    if (thumbnailContainer && video.videoUrl) {
        thumbnailContainer.addEventListener('click', () => {
            window.open(video.videoUrl, '_blank');
        });
    }
    
    // タイトル
    const titleElement = document.getElementById('video-title');
    if (titleElement) titleElement.textContent = video.title || 'タイトルなし';
    
    // 視聴回数
    const viewCountElement = document.getElementById('view-count');
    if (viewCountElement) {
        const formattedViewCount = formatViewCount(video.viewCount);
        viewCountElement.innerHTML = `<i class="fas fa-eye"></i> ${formattedViewCount} 回視聴`;
    }
    
    // 配信日
    const publishedDateElement = document.getElementById('published-date');
    if (publishedDateElement && video.publishedAt) {
        try {
            // データの publishedAt から直接年月日を抽出
            const dateParts = video.publishedAt.split('T')[0].split('-');
            const year = dateParts[0];
            const month = dateParts[1];
            const day = dateParts[2];
            const publishedDateJP = `${year}年${month}月${day}日`;
            
            publishedDateElement.innerHTML = `<i class="fas fa-calendar-alt"></i> ${publishedDateJP}`;
        } catch (e) {
            console.error('日付処理中にエラー:', e);
            publishedDateElement.innerHTML = '<i class="fas fa-calendar-alt"></i> 日付不明';
        }
    }
    
    // 動画時間
    const durationElement = document.getElementById('video-duration');
    if (durationElement) {
        const formattedDuration = formatDuration(video.duration);
        durationElement.innerHTML = `<i class="fas fa-clock"></i> ${formattedDuration || '-'}`;
    }
    
    // タグ
    const tagsElement = document.getElementById('video-tags');
    if (tagsElement) {
        tagsElement.innerHTML = '';
        if (video.tags && Array.isArray(video.tags) && video.tags.length > 0) {
            video.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag';
                tagSpan.textContent = `#${tag}`;
                tagsElement.appendChild(tagSpan);
            });
        } else {
            tagsElement.innerHTML = '<span class="no-tags">タグなし</span>';
        }
    }
    
    // Xスペースリンクの表示（タグに「スペース」がある場合）
    addXSpaceLink(video);
    
    // 共有ボタンを追加
    addShareButton(video);
    
    // 説明文
    const descriptionElement = document.getElementById('video-description');
    if (descriptionElement) {
        if (video.description) {
            // URLを自動リンク化
            const linkedDescription = video.description.replace(
                /(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );
            descriptionElement.innerHTML = linkedDescription;
        } else {
            descriptionElement.textContent = '説明文はありません。';
        }
    }
}

// 共有ボタンを追加する関数
function addShareButton(video) {
    // 共有ボタンの配置位置を選択
    const metaContainer = document.querySelector('.video-meta');
    if (!metaContainer) return;
    
    // 既存の共有コンテナを削除（再実行時の重複を防ぐ）
    const existingShareContainer = document.querySelector('.share-container');
    if (existingShareContainer) {
        existingShareContainer.remove();
    }
    
    // コピーボタンコンテナを作成
    const copyContainer = document.createElement('div');
    copyContainer.className = 'share-container';
    
    // コピーボタンを作成
    const copyButton = document.createElement('button');
    copyButton.className = 'share-button';
    
    // Font Awesomeコピーアイコンを追加
    const copyIcon = document.createElement('i');
    copyIcon.className = 'fas fa-copy';
    copyButton.appendChild(copyIcon);
    
    // ボタンテキストを追加
    const buttonText = document.createTextNode(' コピー');
    copyButton.appendChild(buttonText);
    
    // クリックイベントを追加
    copyButton.addEventListener('click', () => copyVideoInfo(video));
    
    // コンテナにボタンを追加
    copyContainer.appendChild(copyButton);
    
    // コピーコンテナをvideo-metaに追加
    metaContainer.appendChild(copyContainer);
}

// 動画情報をコピーする関数
function copyVideoInfo(video) {
    // 配信日を整形（単純にYYYY年MM月DD日形式に変換）
    let jpDate = '日付不明';
    if (video.publishedAt) {
        try {
            // データの publishedAt から直接年月日を抽出
            const dateParts = video.publishedAt.split('T')[0].split('-');
            const year = dateParts[0];
            const month = dateParts[1];
            const day = dateParts[2];
            jpDate = `${year}年${month}月${day}日`;
        } catch (e) {
            console.error('日付処理中にエラー:', e);
        }
    }
    
    // スペースタグを持つかどうか確認
    const isSpace = video.tags && Array.isArray(video.tags) && video.tags.includes('スペース');
    
    // コピー用テキストの基本部分
    let baseText = `${jpDate}にマール・アストレアさんが配信しました\n${video.title}`;
    
    // コピー用テキストを完成させる
    let copyText = '';
    if (isSpace && video.videoId) {
        // スペースの場合：日時＋タイトル＋URL＋ハッシュタグ
        const spaceUrl = `https://x.com/i/spaces/${video.videoId}`;
        copyText = `${baseText}\n${spaceUrl}\n#マールの軌跡`;
    } else {
        // スペース以外の場合：日時＋タイトル＋ハッシュタグ
        copyText = `${baseText}\n#マールの軌跡`;
    }
    
    // クリップボードにコピー
    fallbackCopyToClipboard(copyText);
}

// クリップボードにコピーするフォールバック関数
function fallbackCopyToClipboard(text) {
    // モダンなClipboard APIを試す
    if (navigator.clipboard && window.isSecureContext) {
        // セキュアコンテキスト（HTTPS）でNavigator clipboard APIを使用
        navigator.clipboard.writeText(text)
            .then(() => {
                showCopyMessage('クリップボードにコピーしました！');
            })
            .catch(err => {
                console.error('Clipboard API エラー:', err);
                legacyCopyToClipboard(text);
            });
    } else {
        // フォールバック手法を使用
        legacyCopyToClipboard(text);
    }
}

// レガシーなコピー方法（フォールバック）
function legacyCopyToClipboard(text) {
    // テキストエリアを作成
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    // テキストを選択してコピー
    textArea.focus();
    textArea.select();
    
    let successful = false;
    try {
        successful = document.execCommand('copy');
    } catch (err) {
        console.error('クリップボードへのコピーに失敗しました', err);
    }
    
    // テキストエリアを削除
    document.body.removeChild(textArea);
    
    // コピー成功通知を表示
    if (successful) {
        showCopyMessage('クリップボードにコピーしました！');
    } else {
        showCopyMessage('コピーに失敗しました。手動でコピーしてください。');
    }
}

// コピー成功メッセージを表示する関数
function showCopyMessage(message) {
    const shareContainer = document.querySelector('.share-container');
    
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.copy-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // メッセージ要素を作成
    const messageElement = document.createElement('div');
    messageElement.className = 'copy-message';
    messageElement.textContent = message;
    
    // コンテナに追加
    shareContainer.appendChild(messageElement);
    
    // 3秒後に削除
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// エラー表示
function displayError(message) {
    const loadingElement = document.getElementById('video-loading');
    if (loadingElement) {
        loadingElement.innerHTML = `<p class="error-message">${message}</p>`;
    }
}

// ヘルパー関数: 再生回数のフォーマット
function formatViewCount(count) {
    if (count === null || typeof count === 'undefined') return '-';
    const numCount = parseInt(count);
    if (isNaN(numCount)) return '-';
    
    if (numCount >= 10000) {
        return (numCount / 10000).toFixed(1) + '万';
    }
    return numCount.toLocaleString();
}

// ヘルパー関数: 動画時間のフォーマット
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
                if (isNaN(h) || isNaN(m) || isNaN(s)) return '';
                if (h > 0) {
                    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                } else {
                    return `${m}:${s.toString().padStart(2, '0')}`;
                }
            } else if (parts.length === 2) {
                const m = parseInt(parts[0], 10);
                const s = parseInt(parts[1], 10);
                if (isNaN(m) || isNaN(s)) return '';
                return `${m}:${s.toString().padStart(2, '0')}`;
            }
            return '';
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
        return '';
    }
}

// Xスペースのリンクを追加する関数
function addXSpaceLink(video) {
    // スペースタグを持つ動画かどうかチェック
    const hasSpaceTag = video.tags && Array.isArray(video.tags) && video.tags.includes('スペース');
    if (!hasSpaceTag) {
        // スペースタグがない場合、既存のスペースリンクコンテナがあれば削除
        const spaceContainer = document.getElementById('space-link-container');
        if (spaceContainer) {
            spaceContainer.remove();
        }
        return;
    }
    
    console.log('スペースタグを持つ動画を検出:', video.id, video.title);
    
    // スペースリンクのコンテナを取得または作成
    let spaceContainer = document.getElementById('space-link-container');
    if (!spaceContainer) {
        spaceContainer = document.createElement('div');
        spaceContainer.id = 'space-link-container';
        spaceContainer.className = 'space-link-container';
        
        // テキスト情報コンテナの適切な位置に挿入
        const metaElement = document.querySelector('.video-meta');
        if (metaElement) {
            metaElement.after(spaceContainer);
        } else {
            const infoContainer = document.querySelector('.video-info-container');
            if (infoContainer) {
                infoContainer.appendChild(spaceContainer);
            }
        }
    } else {
        spaceContainer.innerHTML = ''; // 既存のコンテナをクリア
    }
    
    // スペースIDはvideoIdをそのまま使用
    const spaceId = video.videoId;
    console.log('スペースID:', spaceId);
    
    // スペースURLを生成
    const spaceUrl = `https://x.com/i/spaces/${spaceId}`;
    console.log('スペースURL:', spaceUrl);
    
    // スペースリンクを作成
    const spaceLink = document.createElement('a');
    spaceLink.href = spaceUrl;
    spaceLink.target = '_blank';
    spaceLink.rel = 'noopener noreferrer';
    spaceLink.className = 'space-link';
    
    // リンクにXアイコンを追加
    const xIcon = document.createElement('img');
    // 画像パスを修正
    xIcon.src = 'assets/data/images/icon/twitter_icon.jpg';
    console.log('Xアイコンパス:', xIcon.src);
    xIcon.alt = 'X (Twitter) Space';
    xIcon.className = 'x-icon';
    
    // エラーハンドリング
    xIcon.onerror = function() {
        console.error('Xアイコンの読み込みに失敗しました。パス:', xIcon.src);
        // アイコン非表示
        this.style.display = 'none';
        // テキストを修正
        linkText.textContent = 'X (Twitter) でスペースを見る';
    };
    
    // リンクにテキストを追加
    const linkText = document.createElement('span');
    linkText.textContent = 'Xでスペースを見る';
    
    spaceLink.appendChild(xIcon);
    spaceLink.appendChild(linkText);
    spaceContainer.appendChild(spaceLink);
    
    // スペースIDも表示
    const idDisplay = document.createElement('div');
    idDisplay.className = 'space-id';
    idDisplay.textContent = `@https://x.com/i/spaces/${spaceId}`;
    spaceContainer.appendChild(idDisplay);
}

// グローバルスコープへエクスポート
window.initVideoDetailPage = initVideoDetailPage; 