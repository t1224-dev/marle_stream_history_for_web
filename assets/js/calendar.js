let calendarInstance = null; // カレンダーインスタンスを保持

// カレンダー画面の初期化関数 (app.js から渡される)
function initCalendarPage(allVideos, displayVideosFunc, createVideoCardFunc) {
    console.log('カレンダー画面の初期化を開始 (calendar.js)');
    const calendarEl = document.getElementById('calendar');
    const selectedDateHeader = document.getElementById('selected-date-header');
    const selectedDateVideosContainer = document.getElementById('selected-date-videos');

    if (!calendarEl || !selectedDateHeader || !selectedDateVideosContainer) {
        console.error('[calendar.js] カレンダー画面の要素が見つかりません。');
        return;
    }

    // FullCalendar ライブラリが読み込まれているか確認
    if (typeof FullCalendar === 'undefined') {
        console.error('[calendar.js] FullCalendarライブラリが読み込まれていません。index.htmlを確認してください。');
        calendarEl.innerHTML = '<p style="color: red;">カレンダーライブラリの読み込みに失敗しました。</p>';
        return;
    }

    // 既存のカレンダーインスタンスがあれば破棄
    if (calendarInstance) {
        try {
             calendarInstance.destroy();
        } catch (e) {
             console.warn('[calendar.js] 既存カレンダーの破棄中にエラー:', e);
        }
        calendarInstance = null;
    }

    // 動画データからFullCalendar用のイベントを作成
    const events = [];
    allVideos.forEach(video => {
        try {
            if (!video.publishedAt || typeof video.publishedAt !== 'string') {
                console.warn(`[calendar.js] 動画ID ${video.id} の publishedAt が無効です。スキップします。`);
                return; // この動画をスキップ
            }
            const datePart = video.publishedAt.split('T')[0];
            // 簡単な日付形式チェック (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                 console.warn(`[calendar.js] 動画ID ${video.id} の publishedAt の形式 (${datePart}) が正しくありません。スキップします。`);
                 return;
            }
            events.push({
                title: '配信あり',
                start: datePart,
                extendedProps: {
                    videoId: video.id
                },
                display: 'background'
            });
        } catch (e) {
            console.error(`[calendar.js] 動画ID ${video.id} のイベント作成中にエラーが発生しました:`, e);
        }
    });


    // 同じ日付のイベントを集約（マーカー表示のため）
    const uniqueEventDates = [...new Set(events.map(e => e.start))];
    const backgroundEvents = uniqueEventDates.map(date => ({
         start: date,
         display: 'background',
         classNames: ['has-event'] // マーカー用のクラス
    }));

    // 動画データの日付範囲を計算
    let minDateStr = null;
    let maxDateStr = null;
    if (allVideos.length > 0) {
        // Sort by timestamp to correctly find earliest and latest videos
        const sortedVideos = [...allVideos]
            .filter(v => v.publishedAt)
            .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

        if (sortedVideos.length > 0) {
             try {
                 const firstVideoDate = new Date(sortedVideos[0].publishedAt);
                 const lastVideoDate = new Date(sortedVideos[sortedVideos.length - 1].publishedAt);

                 if (isNaN(firstVideoDate.getTime()) || isNaN(lastVideoDate.getTime())) {
                     console.error("[calendar.js] Error parsing date for range calculation.");
                 } else {
                     // 最初の動画の月の初日 (UTC基準で計算)
                     const firstYearUTC = firstVideoDate.getUTCFullYear();
                     const firstMonthUTC = firstVideoDate.getUTCMonth(); // 0-indexed
                     minDateStr = `${firstYearUTC}-${(firstMonthUTC + 1).toString().padStart(2, '0')}-01`;

                     // 最後の動画の月の翌月初日 (UTC基準で計算)
                     const lastYearUTC = lastVideoDate.getUTCFullYear();
                     const lastMonthUTC = lastVideoDate.getUTCMonth(); // 0-indexed
                     // Create a date for the first day of the *next* month in UTC
                     const nextMonthDate = new Date(Date.UTC(lastYearUTC, lastMonthUTC + 1, 1));
                     const nextMonthYearUTC = nextMonthDate.getUTCFullYear();
                     const nextMonthMonthUTC = nextMonthDate.getUTCMonth(); // 0-indexed
                     maxDateStr = `${nextMonthYearUTC}-${(nextMonthMonthUTC + 1).toString().padStart(2, '0')}-01`;

                     console.log(`[calendar.js] Valid date range calculated (UTC based): ${minDateStr} to ${maxDateStr}`);
                 }
             } catch (e) {
                 console.error("[calendar.js] Error calculating date range:", e);
             }
        }
    }

    try {
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            locale: 'ja', // 日本語化
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev',
                center: 'title',
                right: 'next'
            },
            events: backgroundEvents, // マーカー表示用の背景イベント
            dateClick: function(info) {
                // handleDateClick を calendar.js 内で呼び出す
                handleDateClick(info.dateStr, selectedDateHeader, selectedDateVideosContainer, allVideos, displayVideosFunc, false);
            },
            contentHeight: 'auto', // 内容に合わせて高さを自動調整
            fixedWeekCount: false, // 週の数を固定しない
            validRange: minDateStr && maxDateStr ? {
                start: minDateStr,
                end: maxDateStr // end is exclusive
            } : undefined // 範囲が計算できなければ設定しない
        });

        calendarInstance.render();
        console.log('FullCalendarを描画しました (calendar.js)');

        // 最新（最後の）動画の日付を取得して初期選択
        let latestVideoDate = null;
        if (allVideos.length > 0) {
            // publishedAtでソートして最新の動画を見つける
            const sortedVideos = [...allVideos]
                .filter(v => v.publishedAt)
                .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
            
            if (sortedVideos.length > 0) {
                try {
                    // 最新動画の日付文字列を取得（YYYY-MM-DD形式）
                    latestVideoDate = sortedVideos[0].publishedAt.split('T')[0];
                    console.log(`[calendar.js] 最新動画の日付: ${latestVideoDate}`);
                    
                    // 最新動画の日付を選択
                    handleDateClick(latestVideoDate, selectedDateHeader, selectedDateVideosContainer, allVideos, displayVideosFunc, true);
                    
                    // カレンダーの表示月も最新動画の月に合わせる
                    const latestDate = new Date(latestVideoDate);
                    calendarInstance.gotoDate(latestDate);
                } catch (e) {
                    console.error('[calendar.js] 最新動画の日付処理中にエラー:', e);
                    // エラー時は今日の日付をフォールバックとして使用
                    const todayStr = new Date().toISOString().split('T')[0];
                    handleDateClick(todayStr, selectedDateHeader, selectedDateVideosContainer, allVideos, displayVideosFunc, true);
                }
            } else {
                // publishedAtが有効な動画がない場合は今日の日付を使用
                const todayStr = new Date().toISOString().split('T')[0];
                handleDateClick(todayStr, selectedDateHeader, selectedDateVideosContainer, allVideos, displayVideosFunc, true);
            }
        } else {
            // 動画がない場合は今日の日付を使用
            const todayStr = new Date().toISOString().split('T')[0];
            handleDateClick(todayStr, selectedDateHeader, selectedDateVideosContainer, allVideos, displayVideosFunc, true);
        }

    } catch (error) {
        console.error('[calendar.js] FullCalendarの初期化または描画中にエラーが発生しました:', error);
        calendarEl.innerHTML = '<p style="color: red;">カレンダーの表示に失敗しました。開発者コンソールを確認してください。</p>';
    }
}

// 日付クリック時の処理 (app.js から渡される関数を使用)
function handleDateClick(dateStr, headerElement, videosContainer, allVideos, displayVideosFunc, isInitial = false) {
    try {
        const selectedDate = new Date(dateStr + 'T00:00:00'); // クリックされた日付 (UTC 0時として扱う)
        if (isNaN(selectedDate.getTime())) {
            console.error(`[calendar.js] 無効な日付文字列です: ${dateStr}`);
            if (!isInitial) {
                headerElement.textContent = '無効な日付です';
                videosContainer.innerHTML = '';
            }
            return;
        }

        // UTC基準で選択された年月日を取得
        const selectedUTCDate = selectedDate.getUTCDate();
        const selectedUTCMonth = selectedDate.getUTCMonth();
        const selectedUTCFullYear = selectedDate.getUTCFullYear();

        // handleDateClick 内の filter 部分の修正案
        const videosOnDate = allVideos.filter(video => {
            try {
                if (!video.publishedAt || typeof video.publishedAt !== 'string') return false;
                // 動画の publishedAt (UTC) から YYYY-MM-DD 部分を抽出
                const videoDateStr = video.publishedAt.split('T')[0];
                if (!/^\d{4}-\d{2}-\d{2}$/.test(videoDateStr)) return false; // 形式チェック

                // dateStr (クリックされた日付 'YYYY-MM-DD') と直接比較
                console.log(`[Debug] Comparing Clicked DateStr: ${dateStr} with Video DateStr: ${videoDateStr} (Video ID: ${video.id})`); // 新しいデバッグログ
                return videoDateStr === dateStr;
            } catch (e) {
                console.error(`[calendar.js] 動画ID ${video.id} の日付比較中にエラー:`, e);
                return false;
            }
        });

        // ヘッダー表示用の日付はローカルタイムゾーンのままで良い、またはUTCにするか選択
        // ここではローカルタイムゾーンの日付で表示
        const displayDate = new Date(dateStr + 'T00:00:00');
        headerElement.textContent = `${displayDate.getFullYear()}年${displayDate.getMonth() + 1}月${displayDate.getDate()}日`;

        videosContainer.innerHTML = ''; // コンテナをクリア
        if (videosOnDate.length > 0) {
            headerElement.textContent += ` (${videosOnDate.length}件の配信)`;
            displayVideosFunc(videosOnDate, videosContainer); // app.js の関数を呼び出す
            console.log(`[calendar.js] ${dateStr} の動画 ${videosOnDate.length} 件を表示しました`);
            
            // 動画が存在する場合は、滑らかにスクロール
            if (!isInitial) { // 初期表示時はスクロールしない
                setTimeout(() => {
                    // 選択された日付のヘッダー位置までスクロール
                    headerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100); // 少し遅延させてDOMが更新された後にスクロール
            }
        } else {
            if (!isInitial) { // 初期表示時以外はメッセージ表示
                 videosContainer.innerHTML = '<p class="no-videos-message">この日の配信はありません。</p>';
                 console.log(`[calendar.js] ${dateStr} に配信はありませんでした`);
            } else {
                 headerElement.textContent = '日付を選択してください'; // 初期表示で動画がない場合はデフォルトに戻す
                 console.log(`[calendar.js] 初期表示: ${dateStr} に配信はありませんでした`);
                 videosContainer.innerHTML = ''; // 初期表示で動画がない場合もクリア
            }
        }

        // カレンダー上の選択日表示を更新
        if (calendarInstance) {
             calendarInstance.el.querySelectorAll('.fc-daygrid-day.selected-day').forEach(el => {
                 el.classList.remove('selected-day');
            });
            const dayCell = calendarInstance.el.querySelector(`.fc-day[data-date="${dateStr}"]`);
            if (dayCell) {
                 dayCell.classList.add('selected-day');
            }
        }
    } catch (error) {
        console.error(`[calendar.js] handleDateClick処理中にエラーが発生しました (日付: ${dateStr}):`, error);
        headerElement.textContent = 'エラーが発生しました';
        videosContainer.innerHTML = '<p class="no-videos-message">動画の表示中にエラーが発生しました。</p>';
    }
}

// カレンダー選択日付に表示する動画リストを更新
function updateDateVideos(dateStr) {
    // 動画リストコンテナを取得
    const container = document.getElementById('date-videos');
    if (!container) return;

    // 日付が未選択の場合、リストを非表示にして終了
    if (!dateStr) {
        const selectedDateInfo = document.querySelector('.selected-date-info');
        if (selectedDateInfo) {
            selectedDateInfo.style.display = 'none';
        }
        return;
    }

    // 選択された日付に対応する動画をフィルタリング
    const videosOnDate = allVideos.filter(video => {
        try {
            if (!video.publishedAt || typeof video.publishedAt !== 'string') return false;
            const videoDateStr = video.publishedAt.split('T')[0];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(videoDateStr)) return false;
            return videoDateStr === dateStr;
        } catch (e) {
            console.error(`[calendar.js] 動画ID ${video.id} の日付比較中にエラー:`, e);
            return false;
        }
    });

    // 日付表示を整形（YYYY-MM-DD → YYYY/MM/DD）
    const formattedDate = dateStr.replace(/-/g, '/');

    // 選択日付の情報を表示
    const selectedDateInfo = document.querySelector('.selected-date-info');
    if (selectedDateInfo) {
        selectedDateInfo.style.display = 'block';
        const dateHeader = selectedDateInfo.querySelector('h3');
        if (dateHeader) {
            dateHeader.textContent = `${formattedDate}の配信 (${videosOnDate.length}件)`;
        }
    }

    // 動画リストを表示
    if (container) {
        if (videosOnDate.length === 0) {
            container.innerHTML = '<p class="no-videos-message">この日の配信はありません。</p>';
        } else {
            // リストクリア
            container.innerHTML = '';
            
            // 動画カードを追加
            videosOnDate.forEach(video => {
                const videoCard = createVideoCardFunc(video);
                
                // 動画カードのクリックイベントハンドラ - 詳細ページに遷移
                videoCard.addEventListener('click', () => {
                    // app.jsのloadPage関数を呼び出す
                    if (typeof window.loadPage === 'function') {
                        window.loadPage('video-detail', { videoId: video.id, fromPage: 'calendar' });
                        // 注: URLハッシュはloadPage内で適切に管理されるためここで直接変更しない
                    } else {
                        console.error('loadPage関数が見つかりません');
                    }
                });
                
                container.appendChild(videoCard);
            });
        }
    }
} 