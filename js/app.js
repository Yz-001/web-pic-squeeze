/**
 * 图片压缩工具
 * 支持单文件和批量压缩
 */

(function() {
    'use strict';

    // ========================================
    // 配置常量
    // ========================================
    const CONFIG = {
        MAX_ITERATIONS: 25,
        TOLERANCE: 0.05,
        MIN_QUALITY: 0.1,
        MAX_QUALITY: 0.99,
        AUTO_QUALITY: 0.92,
        MAX_DIMENSION: 4096,
        MIN_TARGET_KB: 1,
        TOAST_DURATION: 3000,
        VALID_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        MAX_BATCH_COUNT: 20,
        MAX_HISTORY_COUNT: 10
    };

    // ========================================
    // 主题管理
    // ========================================
    const Theme = {
        current: 'light',
        toggle: null,
        sunIcon: null,
        moonIcon: null,

        init() {
            this.toggle = document.getElementById('themeToggle');
            this.sunIcon = this.toggle?.querySelector('.theme-icon-sun');
            this.moonIcon = this.toggle?.querySelector('.theme-icon-moon');

            // 从 localStorage 读取主题设置，默认为 light
            const saved = localStorage.getItem('picSqueeze_theme');
            this.current = saved || 'light';
            this.apply(this.current);

            // 绑定切换事件
            this.toggle?.addEventListener('click', () => this.toggleTheme());
        },

        apply(theme) {
            this.current = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('picSqueeze_theme', theme);

            // 更新图标显示
            if (this.sunIcon && this.moonIcon) {
                if (theme === 'dark') {
                    this.sunIcon.style.display = 'none';
                    this.moonIcon.style.display = 'block';
                } else {
                    this.sunIcon.style.display = 'block';
                    this.moonIcon.style.display = 'none';
                }
            }
        },

        toggleTheme() {
            const newTheme = this.current === 'light' ? 'dark' : 'light';
            this.apply(newTheme);
            showToast(`已切换至${newTheme === 'dark' ? '暗色' : '明亮'}模式`, 'success', 1500);
        }
    };

    // ========================================
    // DOM 引用
    // ========================================
    const DOM = {
        // 上传区域
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        uploadText: document.querySelector('.upload-main'),
        uploadHint: document.querySelector('.upload-hint-text'),
        reuploadBar: document.getElementById('reuploadBar'),
        reuploadBtn: document.getElementById('reuploadBtn'),

        // 设置区域
        settingsSection: document.getElementById('settingsSection'),
        targetSize: document.getElementById('targetSize'),
        sizeUnit: document.getElementById('sizeUnit'),
        outputFormat: document.getElementById('outputFormat'),
        originalSize: document.getElementById('originalSize'),
        originalDimension: document.getElementById('originalDimension'),

        // 尺寸调整
        dimensionMode: document.getElementById('dimensionMode'),
        dimensionCustomRow: document.getElementById('dimensionCustomRow'),
        dimensionPercentRow: document.getElementById('dimensionPercentRow'),
        dimensionHint: document.getElementById('dimensionHint'),
        customWidth: document.getElementById('customWidth'),
        customHeight: document.getElementById('customHeight'),
        lockRatio: document.getElementById('lockRatio'),
        scalePercent: document.getElementById('scalePercent'),
        scaleValueText: document.getElementById('scaleValueText'),

        // 模式切换
        modeTabs: document.querySelectorAll('.mode-tab'),
        singleMode: document.getElementById('singleMode'),
        batchMode: document.getElementById('batchMode'),

        // 操作按钮
        compressBtn: document.getElementById('compressBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        resetBtn: document.getElementById('resetBtn'),

        // 单文件预览
        previewSection: document.getElementById('previewSection'),
        previewInfo: document.getElementById('previewInfo'),
        compressionRate: document.getElementById('compressionRate'),
        compressionTime: document.getElementById('compressionTime'),
        originalPreview: document.getElementById('originalPreview'),
        originalSizeLabel: document.getElementById('originalSizeLabel'),
        compressedItem: document.getElementById('compressedItem'),
        compressedPreview: document.getElementById('compressedPreview'),
        compressedSizeLabel: document.getElementById('compressedSizeLabel'),
        downloadBtn: document.getElementById('downloadBtn'),

        // 滑动对比
        normalPreview: document.getElementById('normalPreview'),
        compareContainer: document.getElementById('compareContainer'),
        compareModeBtn: document.getElementById('compareModeBtn'),
        exitCompareBtn: document.getElementById('exitCompareBtn'),
        compareOriginal: document.getElementById('compareOriginal'),
        compareCompressed: document.getElementById('compareCompressed'),
        compareSlider: document.getElementById('compareSlider'),
        compareOriginalSize: document.getElementById('compareOriginalSize'),
        compareCompressedSize: document.getElementById('compareCompressedSize'),

        // 批量预览
        batchSection: document.getElementById('batchSection'),
        batchList: document.getElementById('batchList'),
        batchProgress: document.getElementById('batchProgress'),
        batchProgressText: document.getElementById('batchProgressText'),
        batchDownloadAll: document.getElementById('batchDownloadAll'),
        batchCount: document.getElementById('batchCount'),

        // 图片预览弹窗
        imageModal: document.getElementById('imageModal'),
        modalImage: document.getElementById('modalImage'),
        modalClose: document.querySelector('.modal-close'),
        modalBackdrop: document.querySelector('.modal-backdrop'),

        // 历史记录
        historySidebar: document.getElementById('historySidebar'),
        historyTitle: document.getElementById('historyTitle'),
        historyCount: document.getElementById('historyCount'),
        historyList: document.getElementById('historyList'),
        historyClear: document.getElementById('historyClear'),
        historyFab: document.getElementById('historyFab'),
        historyFabCount: document.getElementById('historyFabCount'),
        historyOverlay: document.getElementById('historyOverlay'),

        // Toast
        toast: document.getElementById('toast')
    };

    // ========================================
    // 状态管理
    // ========================================
    const state = {
        // 当前模式
        mode: 'single', // 'single' | 'batch'

        // 单文件状态
        single: {
            file: null,
            blob: null,
            fileName: '',
            isCompressing: false,
            cancelled: false
        },

        // 批量状态
        batch: {
            files: [],
            results: [],
            isCompressing: false,
            currentIndex: 0,
            cancelled: false
        },

        // 历史记录
        history: [],

        // 图片尺寸
        imageDimension: null,

        // 尺寸调整状态
        dimension: {
            mode: 'original', // 'original' | 'percent' | 'custom'
            scalePercent: 80,
            customWidth: null,
            customHeight: null,
            ratioLocked: true
        },

        // 滑动对比状态
        compare: {
            active: false,
            position: 50
        }
    };

    // ========================================
    // 工具函数
    // ========================================

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function showToast(message, type = '', duration = CONFIG.TOAST_DURATION) {
        DOM.toast.textContent = message;
        DOM.toast.className = 'toast show' + (type ? ` ${type}` : '');

        clearTimeout(DOM.toast._timer);
        DOM.toast._timer = setTimeout(() => {
            DOM.toast.className = 'toast';
        }, duration);
    }

    // ========================================
    // 建议目标大小计算
    // ========================================

    /**
     * 根据原始大小计算建议的目标大小
     * 确保压缩后图片质量可接受（约70-80%压缩率）
     */
    function suggestTargetSize(originalBytes) {
        const originalKB = originalBytes / 1024;
        const originalMB = originalBytes / (1024 * 1024);

        // 小于100KB：不建议压缩太多，保持原样或轻微压缩
        if (originalKB < 100) {
            return null; // 不设置，使用自动压缩
        }

        // 100KB - 1MB：建议压缩到原大小的60%
        if (originalKB < 1024) {
            const targetKB = Math.round(originalKB * 0.6);
            return { value: targetKB, unit: 'KB' };
        }

        // 1MB - 10MB：建议压缩到原大小的40%
        if (originalMB < 10) {
            const targetMB = Math.round(originalMB * 0.4 * 10) / 10; // 保留一位小数
            return { value: targetMB, unit: 'MB' };
        }

        // 10MB以上：建议压缩到原大小的30%
        const targetMB = Math.round(originalMB * 0.3 * 10) / 10;
        return { value: targetMB, unit: 'MB' };
    }

    // ========================================
    // IndexedDB 存储 (用于存储 blob 数据)
    // ========================================

    const DB_NAME = 'picSqueezeDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'history';
    let db = null;

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.warn('IndexedDB 初始化失败:', request.error);
                resolve(null); // 回退到 localStorage
            };

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async function saveBlobToDB(blob, id) {
        if (!db) return null;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ id, blob });

            request.onsuccess = () => resolve(id);
            request.onerror = () => resolve(null);
        });
    }

    async function getBlobFromDB(id) {
        if (!db) return null;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result?.blob || null);
            request.onerror = () => resolve(null);
        });
    }

    async function deleteBlobFromDB(id) {
        if (!db) return;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    }

    async function clearDB() {
        if (!db) return;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    }

    // ========================================
    // 历史记录管理
    // ========================================

    async function loadHistory() {
        try {
            const saved = localStorage.getItem('picSqueeze_history');
            if (saved) {
                state.history = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('加载历史记录失败:', e);
            state.history = [];
        }
    }

    function saveHistory() {
        try {
            // 只存储元数据，不存储 blob
            const metaList = state.history.map(item => ({
                id: item.id,
                fileName: item.fileName,
                preview: item.preview,
                originalSize: item.originalSize,
                compressedSize: item.compressedSize,
                rate: item.rate,
                timestamp: item.timestamp
            }));
            localStorage.setItem('picSqueeze_history', JSON.stringify(metaList));
        } catch (e) {
            console.warn('保存历史记录失败:', e);
            // localStorage 可能满了，清理旧记录
            if (e.name === 'QuotaExceededError' && state.history.length > 1) {
                state.history = state.history.slice(0, Math.floor(state.history.length / 2));
                // 尝试再次保存，但不递归
                try {
                    const metaList = state.history.map(item => ({
                        id: item.id,
                        fileName: item.fileName,
                        preview: item.preview,
                        originalSize: item.originalSize,
                        compressedSize: item.compressedSize,
                        rate: item.rate,
                        timestamp: item.timestamp
                    }));
                    localStorage.setItem('picSqueeze_history', JSON.stringify(metaList));
                } catch (e2) {
                    console.warn('再次保存失败:', e2);
                }
            }
        }
    }

    async function addHistoryItem(item) {
        // 每次压缩都创建新记录，不检查重复
        // 因为即使是同名文件，每次压缩结果可能不同
        const newId = Date.now();
        const historyItem = {
            id: newId,
            fileName: item.fileName,
            preview: item.preview,
            originalSize: item.originalSize,
            compressedSize: item.compressedSize,
            rate: item.rate,
            timestamp: Date.now()
        };

        state.history.unshift(historyItem);

        // 保存 blob 到 IndexedDB
        if (db && item.blob) {
            await saveBlobToDB(item.blob, newId);
        }

        // 限制数量
        if (state.history.length > CONFIG.MAX_HISTORY_COUNT) {
            const removed = state.history.pop();
            if (removed.id && db) {
                await deleteBlobFromDB(removed.id);
            }
        }

        saveHistory();
        updateHistoryUI();
    }

    async function clearHistory() {
        state.history = [];
        localStorage.removeItem('picSqueeze_history');
        await clearDB();
        updateHistoryUI();
        hideHistorySidebar();
        showToast('已清空历史', 'success');
    }

    function showHistorySidebar() {
        DOM.historySidebar.classList.add('show');
        if (window.innerWidth <= 768) {
            // 移动端显示遮罩并锁定滚动
            if (!DOM.historyOverlay) {
                const overlay = document.createElement('div');
                overlay.id = 'historyOverlay';
                overlay.className = 'history-overlay';
                document.body.appendChild(overlay);
                DOM.historyOverlay = overlay;
            }
            DOM.historyOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        // PC端不锁定滚动，侧边栏是悬浮的
    }

    function hideHistorySidebar() {
        DOM.historySidebar.classList.remove('show');
        if (DOM.historyOverlay) {
            DOM.historyOverlay.classList.remove('show');
        }
        document.body.style.overflow = '';
    }

    function toggleHistorySidebar() {
        if (DOM.historySidebar.classList.contains('show')) {
            hideHistorySidebar();
        } else {
            showHistorySidebar();
        }
    }

    function updateHistoryUI() {
        const count = state.history.length;
        DOM.historyCount.textContent = count;
        DOM.historyFabCount.textContent = count;

        // 根据模式和记录数量更新标题
        if (state.mode === 'batch') {
            // 批量模式不显示历史记录悬浮按钮
            DOM.historyFab.style.display = 'none';
        } else {
            // 单张模式始终显示悬浮按钮
            DOM.historyFab.style.display = 'flex';

            // 更新标题
            if (count === 1) {
                DOM.historyTitle.textContent = '单张压缩历史';
            } else {
                DOM.historyTitle.textContent = '压缩历史';
            }
        }

        DOM.historyList.innerHTML = state.history.length === 0
            ? '<div class="history-empty">暂无历史记录</div>'
            : state.history.map((item, index) => createHistoryItemHTML(item, index)).join('');
    }

    function createHistoryItemHTML(item, index) {
        const time = new Date(item.timestamp).toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        // 正确处理压缩率显示
        const rateValue = parseFloat(item.rate);
        const rateDisplay = rateValue >= 0 ? `-${rateValue}%` : `+${Math.abs(rateValue)}%`;
        return `
            <div class="history-item" data-index="${index}" data-id="${item.id}">
                <div class="history-item-preview">
                    <img src="${item.preview}" alt="${item.fileName}">
                </div>
                <div class="history-item-info">
                    <div class="history-item-name">${item.fileName}</div>
                    <div class="history-item-meta">
                        <span>${formatSize(item.originalSize)}</span>
                        <span class="arrow">→</span>
                        <span class="compressed">${formatSize(item.compressedSize)}</span>
                        <span class="rate">${rateDisplay}</span>
                    </div>
                    <div class="history-item-time">${time}</div>
                </div>
                <div class="history-item-actions">
                    <button class="history-item-download" data-index="${index}" data-id="${item.id}" title="下载">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="history-item-delete" data-index="${index}" data-id="${item.id}" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    async function deleteHistoryItem(index) {
        const item = state.history[index];
        if (!item) return;

        // 从 IndexedDB 删除 blob
        if (item.id && db) {
            await deleteBlobFromDB(item.id);
        }

        // 从数组中删除
        state.history.splice(index, 1);
        saveHistory();
        updateHistoryUI();

        showToast('已删除', 'success');
    }

    function scrollToElement(element, offset = 20) {
        setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const top = window.pageYOffset + rect.top - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }, 100);
    }

    function getTargetBytes() {
        const inputValue = parseFloat(DOM.targetSize.value);
        const unit = DOM.sizeUnit.value;

        if (isNaN(inputValue) || inputValue <= 0) {
            return null; // 自动压缩
        }

        let targetBytes = unit === 'MB'
            ? inputValue * 1024 * 1024
            : inputValue * 1024;

        if (targetBytes < CONFIG.MIN_TARGET_KB * 1024) {
            targetBytes = CONFIG.MIN_TARGET_KB * 1024;
        }

        return targetBytes;
    }

    // 获取目标尺寸
    function getTargetDimension() {
        const mode = state.dimension.mode;

        if (mode === 'original' || !state.imageDimension) {
            return null; // 保持原尺寸
        }

        if (mode === 'percent') {
            const scale = state.dimension.scalePercent / 100;
            return {
                width: Math.round(state.imageDimension.width * scale),
                height: Math.round(state.imageDimension.height * scale)
            };
        }

        if (mode === 'custom') {
            const width = parseInt(DOM.customWidth.value, 10);
            const height = parseInt(DOM.customHeight.value, 10);

            if (width > 0 && height > 0) {
                // 限制最大尺寸
                const finalWidth = Math.min(width, CONFIG.MAX_DIMENSION);
                const finalHeight = Math.min(height, CONFIG.MAX_DIMENSION);
                return { width: finalWidth, height: finalHeight };
            }
        }

        return null;
    }

    // ========================================
    // GIF 压缩（支持动态 GIF）
    // ========================================

    function isGifFile(file) {
        return file.type === 'image/gif';
    }

    // 使用 gifuct-js 解析 GIF 帧
    async function decodeGifFrames(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        
        try {
            const gifDecoder = new gifuct.Parser();
            gifDecoder.parse(bytes);
            
            const frames = [];
            const width = gifDecoder.width;
            const height = gifDecoder.height;
            const globalColorTable = gifDecoder.globalColorTable;
            
            for (let i = 0; i < gifDecoder.frames.length && i < 100; i++) {
                const frame = gifDecoder.frames[i];
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                const pixels = gifuct.decodeFrame(frame, width, height, globalColorTable);
                
                const imageData = ctx.createImageData(width, height);
                for (let j = 0; j < pixels.length; j++) {
                    imageData.data[j] = pixels[j];
                }
                ctx.putImageData(imageData, 0, 0);
                
                frames.push({
                    canvas: canvas,
                    delay: frame.delay || 100
                });
            }
            
            return {
                width: width,
                height: height,
                frames: frames,
                isAnimated: frames.length > 1
            };
        } catch (e) {
            console.warn('GIF 帧解析失败:', e);
            return null;
        }
    }

    // 压缩动态 GIF（多帧）
    async function compressAnimatedGif(frameInfo, quality = 10) {
        return new Promise((resolve, reject) => {
            const gif = new GIF({
                workers: 2,
                quality: quality,
                width: frameInfo.width,
                height: frameInfo.height,
                workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
            });
            
            for (const frame of frameInfo.frames) {
                gif.addFrame(frame.canvas, {
                    delay: frame.delay || 100,
                    copy: true
                });
            }
            
            gif.on('finished', resolve);
            gif.on('error', reject);
            gif.render();
        });
    }

    // 压缩静态 GIF（单帧）
    async function compressStaticGif(file, quality = 10) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const gif = new GIF({
                    workers: 2,
                    quality: quality,
                    width: canvas.width,
                    height: canvas.height,
                    workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
                });
                
                gif.addFrame(canvas, { delay: 200, copy: true });
                
                gif.on('finished', function(blob) {
                    URL.revokeObjectURL(img.src);
                    resolve(blob);
                });
                
                gif.on('error', function(err) {
                    URL.revokeObjectURL(img.src);
                    reject(err);
                });
                
                gif.render();
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('GIF 加载失败'));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    // 智能压缩 GIF
    async function compressGif(file, quality = 10) {
        const arrayBuffer = await file.arrayBuffer();
        const frameInfo = await decodeGifFrames(arrayBuffer);
        
        if (frameInfo && frameInfo.isAnimated && frameInfo.frames.length > 1) {
            showToast('动态 GIF (' + frameInfo.frames.length + ' 帧)', 'warning', 3000);
            return await compressAnimatedGif(frameInfo, quality);
        }
        
        return await compressStaticGif(file, quality);
    }

    async function compressGifToTargetSize(file, targetBytes) {
        const arrayBuffer = await file.arrayBuffer();
        const frameInfo = await decodeGifFrames(arrayBuffer);
        const isAnimated = frameInfo && frameInfo.isAnimated && frameInfo.frames.length > 1;
        
        if (isAnimated) {
            showToast('动态 GIF (' + frameInfo.frames.length + ' 帧)，压缩较慢', 'warning', 3000);
        }
        
        let low = 1;
        let high = 30;
        let bestResult = null;
        let iterations = 0;
        const MAX_ITERATIONS = isAnimated ? 5 : 10;
        
        const compressFunc = isAnimated 
            ? (q) => compressAnimatedGif(frameInfo, q)
            : (q) => compressStaticGif(file, q);
        
        let result = await compressFunc(15);
        iterations++;
        
        if (!targetBytes || result.size <= targetBytes) {
            return result;
        }
        
        while (iterations < MAX_ITERATIONS) {
            if (state.single.cancelled || state.batch.cancelled) {
                throw new Error('用户取消');
            }
            
            const mid = Math.round((low + high) / 2);
            result = await compressFunc(mid);
            iterations++;
            
            if (!bestResult || Math.abs(result.size - targetBytes) < Math.abs(bestResult.size - targetBytes)) {
                bestResult = result;
            }
            
            const sizeDiff = Math.abs(result.size - targetBytes) / targetBytes;
            if (sizeDiff <= 0.15 || high - low < 3) {
                return result;
            }
            
            if (result.size > targetBytes) {
                low = mid;
            } else {
                high = mid;
            }
        }
        
        return bestResult || result;
    }

    // ========================================
    // 压缩核心
    // ========================================

    function compressWithQuality(file, quality, mimeType = 'image/jpeg', targetDimension = null) {
        return new Promise((resolve, reject) => {
            const options = {
                quality,
                mimeType: mimeType,
                maxWidth: CONFIG.MAX_DIMENSION,
                maxHeight: CONFIG.MAX_DIMENSION,
                convertSize: Infinity,
                success: resolve,
                error: reject
            };

            // 如果指定了目标尺寸
            if (targetDimension) {
                options.width = targetDimension.width;
                options.height = targetDimension.height;
            }

            new Compressor(file, options);
        });
    }

    async function compressToTargetSize(file, targetBytes, mimeType, targetDimension = null) {
        // GIF 文件使用专门的压缩函数
        if (isGifFile(file)) {
            return await compressGifToTargetSize(file, targetBytes);
        }
        if (!targetBytes && !targetDimension) {
            // 自动压缩，保持原尺寸
            return await compressWithQuality(file, CONFIG.AUTO_QUALITY, mimeType);
        }

        // 如果只是调整尺寸，不限制文件大小
        if (!targetBytes && targetDimension) {
            return await compressWithQuality(file, CONFIG.AUTO_QUALITY, mimeType, targetDimension);
        }

        const { MAX_ITERATIONS, TOLERANCE, MIN_QUALITY, MAX_QUALITY } = CONFIG;

        let low = MIN_QUALITY;
        let high = MAX_QUALITY;
        let bestResult = null;
        let iterations = 0;

        // 初始测试
        let result = await compressWithQuality(file, high, mimeType, targetDimension);
        iterations++;

        if (result.size <= targetBytes) {
            return result;
        }

        // 二分查找
        while (iterations < MAX_ITERATIONS) {
            // 检查是否已取消
            if (state.single.cancelled || state.batch.cancelled) {
                throw new Error('用户取消');
            }

            const mid = (low + high) / 2;
            result = await compressWithQuality(file, mid, mimeType, targetDimension);
            iterations++;

            if (!bestResult || Math.abs(result.size - targetBytes) < Math.abs(bestResult.size - targetBytes)) {
                bestResult = result;
            }

            const sizeDiff = Math.abs(result.size - targetBytes) / targetBytes;
            if (sizeDiff <= TOLERANCE || high - low < 0.01) {
                return result;
            }

            if (result.size > targetBytes) {
                high = mid;
            } else {
                low = mid;
            }
        }

        return bestResult || result;
    }

    // ========================================
    // 文件验证
    // ========================================

    function validateFile(file) {
        if (!file) {
            showToast('请选择图片', 'error');
            return false;
        }

        // 检查文件类型，对于粘贴的图片可能类型不标准
        const validTypes = CONFIG.VALID_TYPES;
        const isPastedImage = file.name && (
            file.name.startsWith('clipboard_') ||
            file.name.startsWith('image.')
        );

        if (!validTypes.includes(file.type)) {
            // 粘贴的图片可能是 'image/bmp' 或其他类型，仍然允许处理
            if (isPastedImage || file.type.startsWith('image/')) {
                console.warn('非标准图片类型:', file.type, '，将尝试处理');
                return true;
            }
            showToast('不支持该格式', 'error');
            return false;
        }

        if (file.size > 50 * 1024 * 1024) {
            showToast('图片较大，请等待', 'warning', 4000);
        }

        return true;
    }

    function validateFiles(files) {
        const validFiles = [];
        for (const file of files) {
            if (CONFIG.VALID_TYPES.includes(file.type)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            showToast('无有效图片', 'error');
            return [];
        }

        if (validFiles.length > CONFIG.MAX_BATCH_COUNT) {
            showToast(`最多${CONFIG.MAX_BATCH_COUNT}张`, 'warning', 4000);
            return validFiles.slice(0, CONFIG.MAX_BATCH_COUNT);
        }

        return validFiles;
    }

    // ========================================
    // 模式切换
    // ========================================

    function switchMode(mode) {
        state.mode = mode;

        // 更新 tab 样式
        DOM.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // 更新文件输入
        DOM.fileInput.multiple = mode === 'batch';

        // 更新提示文字
        if (DOM.uploadHint) {
            DOM.uploadHint.textContent = mode === 'batch' ? '支持多选，最多20张' : '支持 Ctrl+V 粘贴';
        }

        // 清空当前数据
        clearCurrentData();

        // 显示对应区域
        DOM.singleMode.style.display = mode === 'single' ? 'block' : 'none';
        DOM.batchMode.style.display = mode === 'batch' ? 'block' : 'none';

        // 更新历史记录 UI（批量模式不显示悬浮按钮）
        updateHistoryUI();
    }

    function clearCurrentData() {
        // 取消正在进行的压缩
        state.single.cancelled = true;
        state.batch.cancelled = true;

        // 退出滑动对比模式
        if (state.compare.active) {
            state.compare.active = false;
            DOM.normalPreview.style.display = 'grid';
            DOM.compareContainer.style.display = 'none';
        }

        // 清空单文件状态（完全重置）
        state.single = { file: null, blob: null, fileName: '', isCompressing: false, cancelled: false };
        DOM.settingsSection.style.display = 'none';
        DOM.previewSection.style.display = 'none';
        DOM.compressedItem.style.display = 'none';
        DOM.compressedItem.classList.remove('show');
        DOM.previewInfo.style.display = 'none';
        DOM.compareModeBtn.style.display = 'none';
        DOM.originalPreview.src = '';
        DOM.compressedPreview.src = '';

        // 重置上传区域：显示上传框，隐藏重新上传栏
        DOM.dropZone.style.display = 'block';
        DOM.reuploadBar.style.display = 'none';

        // 清空批量状态（完全重置）
        state.batch = { files: [], results: [], isCompressing: false, currentIndex: 0, cancelled: false };
        DOM.batchSection.style.display = 'none';
        DOM.batchList.innerHTML = '';
        DOM.batchProgress.style.display = 'none';
        DOM.batchDownloadAll.style.display = 'none';

        // 重置输入
        DOM.fileInput.value = '';
        DOM.uploadText.textContent = '点击或拖拽上传图片';
        DOM.originalSize.textContent = '-';
        DOM.originalDimension.textContent = '-';

        // 重置尺寸调整状态
        state.dimension = {
            mode: 'original',
            scalePercent: 80,
            customWidth: null,
            customHeight: null,
            ratioLocked: true
        };
        DOM.dimensionMode.value = 'original';
        DOM.dimensionCustomRow.style.display = 'none';
        DOM.dimensionHint.textContent = '保持原始尺寸不变';

        // 重置按钮
        setButtonLoading(false);
        showCancelBtn(false);
    }

    // ========================================
    // 单文件处理
    // ========================================

    function handleSingleUpload(file) {
        if (!validateFile(file)) return;

        // 清空之前的数据
        clearCurrentData();

        // 保存文件
        state.single.file = file;
        // 处理文件名（粘贴的图片可能没有名字或使用默认名）
        const defaultNames = ['image.png', 'image.jpg', 'image.jpeg', 'image.webp', ''];
        if (file.name && !defaultNames.includes(file.name.toLowerCase())) {
            state.single.fileName = file.name.replace(/\.[^/.]+$/, '');
        } else {
            state.single.fileName = 'clipboard_image_' + Date.now();
        }

        // 确保批量区域隐藏，单张模式显示预览区域
        DOM.batchSection.style.display = 'none';

        // 显示设置区域
        DOM.settingsSection.style.display = 'block';
        DOM.originalSize.textContent = formatSize(file.size);
        DOM.originalSizeLabel.textContent = formatSize(file.size);

        // 计算建议目标大小并填充
        const suggested = suggestTargetSize(file.size);
        if (suggested) {
            DOM.targetSize.value = suggested.value;
            DOM.sizeUnit.value = suggested.unit;
        } else {
            DOM.targetSize.value = '';
            DOM.sizeUnit.value = 'MB';
        }

        // 获取图片尺寸
        const img = new Image();
        img.onload = () => {
            state.imageDimension = { width: img.width, height: img.height };
            DOM.originalDimension.textContent = `${img.width} × ${img.height}`;
            // 释放 object URL
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);

        // 预览原图
        const reader = new FileReader();
        reader.onload = (e) => {
            DOM.originalPreview.src = e.target.result;
            DOM.previewSection.style.display = 'block';
            // 添加动画
            setTimeout(() => {
                DOM.originalPreview.classList.add('loaded');
            }, 50);
        };
        reader.readAsDataURL(file);

        // 隐藏上传框，显示重新上传栏
        DOM.dropZone.style.display = 'none';
        DOM.reuploadBar.style.display = 'flex';

        showToast('上传成功', 'success');
    }

    async function compressSingle() {
        const { file } = state.single;
        if (!file) {
            showToast('请先上传', 'error');
            return;
        }

        if (state.single.isCompressing) return;

        state.single.isCompressing = true;
        state.single.cancelled = false;
        setButtonLoading(true);
        showCancelBtn(true);

        // 显示压缩动画占位
        DOM.compressedItem.style.display = 'block';
        DOM.compressedItem.classList.remove('show');
        DOM.compressedPreview.classList.remove('loaded');
        DOM.compressedPreview.src = '';
        const imageBox = DOM.compressedItem.querySelector('.preview-image-box');
        if (imageBox) {
            imageBox.classList.add('compressing');
        }

        const startTime = performance.now();
        const targetBytes = getTargetBytes();
        const targetDimension = getTargetDimension();
        const originalBytes = file.size;
        const formatValue = DOM.outputFormat.value;
        const mimeType = formatValue === 'webp' ? 'image/webp' : formatValue === 'png' ? 'image/png' : formatValue === 'gif' ? 'image/gif' : 'image/jpeg';

        // 显示尺寸调整提示
        if (targetDimension) {
            DOM.dimensionHint.textContent = `输出尺寸: ${targetDimension.width} × ${targetDimension.height}`;
        }

        try {
            // 目标大于原图且没有尺寸调整
            if (targetBytes && targetBytes >= originalBytes && !targetDimension) {
                showToast('目标过大，使用原图', 'warning', 2000);
                if (imageBox) imageBox.classList.remove('compressing');
                finishSingle(file, startTime, originalBytes, true);
                return;
            }

            // 自动模式提示
            if (!targetBytes) {
                showToast('自动压缩中', 'warning', 2000);
            }

            // 压缩
            const blob = await compressToTargetSize(file, targetBytes, mimeType, targetDimension);

            // 检查是否被取消
            if (state.single.cancelled) {
                if (imageBox) imageBox.classList.remove('compressing');
                DOM.compressedItem.style.display = 'none';
                showToast('已取消', 'warning');
                state.single.isCompressing = false;
                setButtonLoading(false);
                showCancelBtn(false);
                return;
            }

            // 移除压缩状态
            if (imageBox) imageBox.classList.remove('compressing');

            // 判断是否需要显示警告提示
            let showWarning = false;
            if (targetBytes && blob.size > targetBytes * 1.1) {
                if (!targetDimension && state.imageDimension &&
                    (state.imageDimension.width > 500 || state.imageDimension.height > 500)) {
                    // 保持原始尺寸，但图片较大，无法压缩到极小目标
                    const actualKB = (blob.size / 1024).toFixed(2);
                    const targetKB = (targetBytes / 1024).toFixed(2);
                    showToast(`目标 ${targetKB} KB，实际 ${actualKB} KB。因保持原始尺寸 ${state.imageDimension.width}×${state.imageDimension.height}，无法达到目标。建议缩小尺寸或调大目标值`, 'warning', 6000);
                    showWarning = true;
                } else if (state.imageDimension &&
                    (state.imageDimension.width > 2000 || state.imageDimension.height > 2000)) {
                    showToast('图片尺寸较大，无法压缩到目标值，可尝试调整尺寸', 'warning', 5000);
                    showWarning = true;
                } else {
                    showToast('已达极限，仍略大于目标', 'warning', 3000);
                    showWarning = true;
                }
            }

            finishSingle(blob, startTime, originalBytes, false, showWarning);

        } catch (error) {
            console.error('压缩失败:', error);
            if (imageBox) imageBox.classList.remove('compressing');
            DOM.compressedItem.style.display = 'none';

            if (error.message === '用户取消') {
                showToast('已取消', 'warning');
            } else {
                showToast('压缩失败: ' + (error.message || '未知错误'), 'error');
            }

            state.single.isCompressing = false;
            setButtonLoading(false);
            showCancelBtn(false);
        }
    }

    function finishSingle(blob, startTime, originalBytes, useOriginal, hasWarning = false) {
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);

        state.single.blob = blob;
        state.single.isCompressing = false;
        setButtonLoading(false);
        showCancelBtn(false);

        // 显示结果
        const reader = new FileReader();
        reader.onload = async (e) => {
            DOM.compressedPreview.src = e.target.result;
            DOM.compressedItem.style.display = 'block';

            // 添加卡片动画
            setTimeout(() => {
                DOM.compressedItem.classList.add('show');
            }, 50);

            // 图片加载动画
            setTimeout(() => {
                DOM.compressedPreview.classList.add('loaded');
            }, 100);

            DOM.compressedSizeLabel.textContent = formatSize(blob.size);

            // 计算压缩率（正确处理正负值）
            const ratePercent = (1 - blob.size / originalBytes) * 100;
            const rateText = ratePercent >= 0
                ? `压缩率 ${ratePercent.toFixed(1)}%`
                : `压缩率 +${Math.abs(ratePercent).toFixed(1)}%（变大）`;
            DOM.compressionRate.textContent = rateText;
            DOM.compressionTime.textContent = `耗时 ${duration}s`;
            DOM.previewInfo.style.display = 'flex';

            // 显示滑动对比按钮（只要有压缩结果）
            DOM.compareModeBtn.style.display = 'inline-flex';

            // 保存到历史记录 (包括 blob 到 IndexedDB)
            // 只有压缩成功的才保存
            if (!useOriginal) {
                await addHistoryItem({
                    fileName: state.single.fileName,
                    preview: e.target.result,
                    originalSize: originalBytes,
                    compressedSize: blob.size,
                    rate: ratePercent.toFixed(1),
                    blob: blob
                });
            }

            // 只有在没有警告的情况下才显示成功提示
            if (!hasWarning) {
                showToast('压缩完成', 'success');
            }
            scrollToElement(DOM.compressedItem);
        };
        reader.readAsDataURL(blob);
    }

    function downloadBlob(blob, fileName) {
        // 处理文件名特殊字符
        const safeName = fileName
            .replace(/[<>:"/\\|?*]/g, '_') // 替换特殊字符
            .replace(/\s+/g, '_'); // 替换空格

        // 根据 blob 类型确定扩展名
        let ext;
        if (blob.type === 'image/gif') {
            ext = 'gif';
        } else if (blob.type === 'image/webp') {
            ext = 'webp';
        } else if (blob.type === 'image/png') {
            ext = 'png';
        } else {
            ext = 'jpg';
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}_compressed.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function downloadSingle() {
        if (!state.single.blob) {
            showToast('请先压缩', 'error');
            return;
        }
        downloadBlob(state.single.blob, state.single.fileName);
        showToast('下载成功', 'success');
    }

    // ========================================
    // 批量处理
    // ========================================

    function handleBatchUpload(files) {
        const validFiles = validateFiles(files);
        if (validFiles.length === 0) return;

        // 清空之前的数据
        clearCurrentData();

        // 保存文件
        state.batch.files = validFiles;

        // 显示设置区域
        DOM.settingsSection.style.display = 'block';
        DOM.batchCount.textContent = validFiles.length;

        // 显示批量区域
        DOM.batchSection.style.display = 'block';

        // 创建文件列表
        DOM.batchList.innerHTML = validFiles.map((file, index) => `
            <div class="batch-item" data-index="${index}">
                <div class="batch-item-preview">
                    <img id="batchImg${index}" alt="${file.name}">
                </div>
                <div class="batch-item-info">
                    <div class="batch-item-name">${file.name}</div>
                    <div class="batch-item-size">
                        <span id="batchOriginalSize${index}">${formatSize(file.size)}</span>
                        <span class="size-arrow" id="batchSizeArrow${index}" style="display: none;"> → </span>
                        <span class="size-compressed" id="batchCompressedSize${index}"></span>
                    </div>
                </div>
                <div class="batch-item-status" id="batchStatus${index}">
                    <span class="status-pending">待压缩</span>
                </div>
                <div class="batch-item-actions" id="batchActions${index}" style="display: none;">
                    <button class="batch-item-compare" id="batchCompare${index}" title="对比">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                            <line x1="12" y1="3" x2="12" y2="21"></line>
                        </svg>
                    </button>
                    <button class="batch-item-download" id="batchDownload${index}" title="下载">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // 加载预览图
        validFiles.forEach((file, index) => {
            loadBatchItemImage(file, index);
        });

        // 隐藏上传框，显示重新上传栏
        DOM.dropZone.style.display = 'none';
        DOM.reuploadBar.style.display = 'flex';

        showToast(`已选择 ${validFiles.length} 张图片`, 'success');
    }

    function loadBatchItemImage(file, index) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById(`batchImg${index}`);
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function addBatchItemUI(file, index) {
        const itemHTML = `
            <div class="batch-item" data-index="${index}">
                <div class="batch-item-preview">
                    <img id="batchImg${index}" alt="${file.name}">
                </div>
                <div class="batch-item-info">
                    <div class="batch-item-name">${file.name}</div>
                    <div class="batch-item-size">${formatSize(file.size)}</div>
                </div>
                <div class="batch-item-status" id="batchStatus${index}">
                    <span class="status-pending">待压缩</span>
                </div>
                <button class="batch-item-download" id="batchDownload${index}" style="display: none;" title="下载">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>
        `;
        DOM.batchList.insertAdjacentHTML('beforeend', itemHTML);
        loadBatchItemImage(file, index);
    }

    async function compressBatch() {
        const { files } = state.batch;
        if (files.length === 0) {
            showToast('请先上传', 'error');
            return;
        }

        if (state.batch.isCompressing) return;

        state.batch.isCompressing = true;
        state.batch.cancelled = false;
        state.batch.results = [];
        state.batch.currentIndex = 0;
        setButtonLoading(true);
        showCancelBtn(true);

        // 显示进度
        DOM.batchProgress.style.display = 'block';
        DOM.batchDownloadAll.style.display = 'none';

        const targetBytes = getTargetBytes();
        const targetDimension = getTargetDimension();
        const formatValue = DOM.outputFormat.value;
        const mimeType = formatValue === 'webp' ? 'image/webp' : formatValue === 'png' ? 'image/png' : formatValue === 'gif' ? 'image/gif' : 'image/jpeg';
        showToast(targetBytes ? '批量压缩中' : '自动压缩中', 'success', 2000);

        // 逐个压缩
        for (let i = 0; i < files.length; i++) {
            // 检查是否已取消
            if (state.batch.cancelled) {
                cleanupBatchState(true);
                return;
            }

            state.batch.currentIndex = i;
            updateBatchProgress(i, files.length);

            const file = files[i];
            const statusEl = document.getElementById(`batchStatus${i}`);

            statusEl.innerHTML = '<span class="status-processing"><span class="mini-spinner"></span>压缩中</span>';

            try {
                const blob = await compressToTargetSize(file, targetBytes, mimeType, targetDimension);
                const fileName = file.name.replace(/\.[^/.]+$/, '');

                // 再次检查是否被取消
                if (state.batch.cancelled) {
                    cleanupBatchState(true);
                    return;
                }

                state.batch.results.push({
                    blob,
                    fileName,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    previewUrl: document.getElementById(`batchImg${i}`)?.src
                });

                // 更新状态和大小对比
                const ratePercent = (1 - blob.size / file.size) * 100;
                const rateText = ratePercent >= 0 ? `-${ratePercent.toFixed(1)}%` : `+${Math.abs(ratePercent).toFixed(1)}%`;
                const statusClass = ratePercent >= 0 ? 'status-done' : 'status-warning';
                statusEl.innerHTML = `<span class="${statusClass}">${rateText}</span>`;

                // 显示压缩后大小
                const sizeArrow = document.getElementById(`batchSizeArrow${i}`);
                const compressedSizeEl = document.getElementById(`batchCompressedSize${i}`);
                if (sizeArrow && compressedSizeEl) {
                    sizeArrow.style.display = 'inline';
                    compressedSizeEl.textContent = formatSize(blob.size);
                }

                // 显示操作按钮
                const actionsEl = document.getElementById(`batchActions${i}`);
                if (actionsEl) actionsEl.style.display = 'flex';

                const downloadBtn = document.getElementById(`batchDownload${i}`);
                if (downloadBtn) {
                    downloadBtn.onclick = () => downloadBatchItem(i);
                }

                const compareBtn = document.getElementById(`batchCompare${i}`);
                if (compareBtn) {
                    compareBtn.onclick = () => showBatchCompare(i);
                }

            } catch (error) {
                console.error(`文件 ${file.name} 压缩失败:`, error);
                if (error.message === '用户取消') {
                    cleanupBatchState(true);
                    return;
                }
                state.batch.results.push(null);
                statusEl.innerHTML = '<span class="status-error">失败</span>';
            }
        }

        // 完成
        state.batch.isCompressing = false;
        setButtonLoading(false);
        showCancelBtn(false);
        DOM.batchProgress.style.display = 'none';

        const successCount = state.batch.results.filter(r => r).length;
        DOM.batchDownloadAll.style.display = successCount > 1 ? 'inline-flex' : 'none';

        // 检查是否有未能压缩到目标的图片
        let hasLargeImages = false;
        if (targetBytes) {
            state.batch.results.forEach((result, idx) => {
                if (result && result.compressedSize > targetBytes * 1.1) {
                    hasLargeImages = true;
                }
            });
        }

        if (hasLargeImages && !targetDimension) {
            // 如果是保持原始尺寸导致的，给出更具体的提示
            showToast(`完成 ${successCount}/${files.length} 张。部分图片因保持原始尺寸无法达到目标值，建议缩小尺寸后重试`, 'warning', 6000);
        } else if (hasLargeImages) {
            showToast(`完成 ${successCount}/${files.length} 张，部分图片因尺寸较大未达目标`, 'warning', 5000);
        } else {
            showToast(`完成 ${successCount}/${files.length} 张，可点击下载`, successCount === files.length ? 'success' : 'warning', 4000);
        }
    }

    function cleanupBatchState(showToastMsg = true) {
        state.batch.isCompressing = false;
        state.batch.cancelled = false;
        setButtonLoading(false);
        showCancelBtn(false);
        DOM.batchProgress.style.display = 'none';

        // 重置未完成的项状态
        for (let i = state.batch.currentIndex; i < state.batch.files.length; i++) {
            const statusEl = document.getElementById(`batchStatus${i}`);
            if (statusEl && statusEl.innerHTML.includes('压缩中')) {
                statusEl.innerHTML = '<span class="status-pending">待压缩</span>';
            }
        }

        if (showToastMsg) {
            showToast('已取消', 'warning');
        }
    }

    function updateBatchProgress(current, total) {
        DOM.batchProgressText.textContent = `正在压缩 ${current + 1}/${total}`;
        const percent = ((current + 1) / total * 100).toFixed(0);
        DOM.batchProgress.querySelector('.progress-bar').style.width = `${percent}%`;
    }

    function downloadBatchItem(index) {
        const result = state.batch.results[index];
        if (!result) return;

        downloadBlob(result.blob, result.fileName);
        showToast('下载成功', 'success');
    }

    function showBatchCompare(index) {
        const result = state.batch.results[index];
        if (!result || !result.blob) {
            showToast('该图片压缩结果无效', 'error');
            return;
        }

        // 获取原图预览
        const originalImg = document.getElementById(`batchImg${index}`);
        if (!originalImg || !originalImg.src) {
            showToast('无法获取原图预览', 'error');
            return;
        }

        // 读取压缩后的图片
        const reader = new FileReader();
        reader.onload = (e) => {
            // 先隐藏批量区域，显示预览区域
            DOM.batchSection.style.display = 'none';
            DOM.previewSection.style.display = 'block';

            // 设置对比图片
            DOM.compareOriginal.src = originalImg.src;
            DOM.compareCompressed.src = e.target.result;
            DOM.compareOriginalSize.textContent = formatSize(result.originalSize);
            DOM.compareCompressedSize.textContent = formatSize(result.compressedSize);

            // 显示对比容器，隐藏普通预览
            DOM.normalPreview.style.display = 'none';
            DOM.compareContainer.style.display = 'block';
            updateComparePosition(50);

            // 设置对比状态
            state.compare.active = true;

            // 滚动到对比区域
            scrollToElement(DOM.compareContainer);

            showToast('滑动对比模式，拖动中间滑块查看差异', 'success', 3000);
        };
        reader.onerror = () => {
            showToast('读取压缩图片失败', 'error');
        };
        reader.readAsDataURL(result.blob);
    }

    function exitCompareMode() {
        state.compare.active = false;

        DOM.normalPreview.style.display = 'grid';
        DOM.compareContainer.style.display = 'none';

        // 如果是从批量对比进入的，返回批量区域
        if (state.mode === 'batch' && state.batch.results.length > 0) {
            DOM.previewSection.style.display = 'none';
            DOM.batchSection.style.display = 'block';
        } else {
            // 单张模式显示对比按钮
            DOM.compareModeBtn.style.display = 'inline-flex';
        }
    }

    function downloadBatchAll() {
        const results = state.batch.results.filter(r => r);
        if (results.length === 0) {
            showToast('没有可下载的图片', 'error');
            return;
        }

        showToast(`正在下载 ${results.length} 张图片，请留意浏览器下载栏`, 'success', 4000);

        results.forEach((result, index) => {
            setTimeout(() => {
                downloadBlob(result.blob, result.fileName);
            }, index * 300);
        });
    }

    // ========================================
    // UI 控制
    // ========================================

    function setButtonLoading(isLoading) {
        const btn = DOM.compressBtn;
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = isLoading;
        btnText.style.display = isLoading ? 'none' : 'flex';
        btnLoading.style.display = isLoading ? 'inline-flex' : 'none';
    }

    function showCancelBtn(show) {
        DOM.cancelBtn.style.display = show ? 'inline-flex' : 'none';
        DOM.resetBtn.style.display = show ? 'none' : 'inline-flex';
    }

    function cancelCompression() {
        state.single.cancelled = true;
        state.batch.cancelled = true;
        showToast('正在取消...', 'warning');
    }

    // ========================================
    // 图片预览弹窗
    // ========================================

    function showImageModal(imageSrc) {
        DOM.modalImage.src = imageSrc;
        DOM.imageModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeImageModal() {
        DOM.imageModal.classList.remove('show');
        document.body.style.overflow = '';
        DOM.modalImage.src = '';
    }

    // ========================================
    // 事件绑定
    // ========================================

    // 模式切换
    DOM.modeTabs.forEach(tab => {
        tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    // 点击上传
    DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());

    // 重新上传按钮
    DOM.reuploadBtn?.addEventListener('click', () => DOM.fileInput.click());

    // 文件选择
    DOM.fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (state.mode === 'batch' || files.length > 1) {
            if (state.mode !== 'batch') switchMode('batch');
            handleBatchUpload(files);
        } else {
            handleSingleUpload(files[0]);
        }
    });

    // 拖拽上传
    DOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.dropZone.classList.add('dragover');
    });

    DOM.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.dropZone.classList.remove('dragover');
    });

    DOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        DOM.dropZone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length === 0) return;

        if (files.length > 1) {
            if (state.mode !== 'batch') switchMode('batch');
            handleBatchUpload(files);
        } else {
            handleSingleUpload(files[0]);
        }
    });

    // 粘贴上传
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // 批量模式：添加到列表
                    if (state.mode === 'batch') {
                        if (state.batch.isCompressing) {
                            showToast('压缩进行中，请等待完成后添加', 'warning');
                            return;
                        }
                        if (state.batch.files.length >= CONFIG.MAX_BATCH_COUNT) {
                            showToast(`已达到最大数量 ${CONFIG.MAX_BATCH_COUNT} 张`, 'warning');
                            return;
                        }
                        // 如果还没有文件，初始化列表
                        if (state.batch.files.length === 0) {
                            handleBatchUpload([file]);
                        } else {
                            // 添加到现有列表
                            state.batch.files.push(file);
                            addBatchItemUI(file, state.batch.files.length - 1);
                            DOM.batchCount.textContent = state.batch.files.length;
                            showToast('已添加到批量列表', 'success');
                        }
                    } else {
                        // 单文件模式
                        handleSingleUpload(file);
                    }
                    break;
                }
            }
        }
    });

    // 压缩按钮
    DOM.compressBtn.addEventListener('click', () => {
        if (state.mode === 'batch') {
            compressBatch();
        } else {
            compressSingle();
        }
    });

    // 取消按钮
    DOM.cancelBtn?.addEventListener('click', cancelCompression);

    // 重置按钮
    DOM.resetBtn.addEventListener('click', clearCurrentData);

    // 单文件下载
    DOM.downloadBtn?.addEventListener('click', downloadSingle);

    // 批量全部下载
    DOM.batchDownloadAll?.addEventListener('click', downloadBatchAll);

    // ========================================
    // 尺寸调整事件
    // ========================================

    // 尺寸模式切换
    DOM.dimensionMode?.addEventListener('change', (e) => {
        state.dimension.mode = e.target.value;

        if (e.target.value === 'original') {
            DOM.dimensionCustomRow.style.display = 'none';
            DOM.dimensionHint.textContent = '保持原始尺寸不变';
        } else if (e.target.value === 'percent') {
            DOM.dimensionCustomRow.style.display = 'block';
            DOM.dimensionPercentRow.style.display = 'flex';
            // 安全检查 imageDimension
            if (state.imageDimension) {
                const newWidth = Math.round(state.imageDimension.width * state.dimension.scalePercent / 100);
                const newHeight = Math.round(state.imageDimension.height * state.dimension.scalePercent / 100);
                DOM.dimensionHint.textContent = `输出尺寸: ${newWidth} × ${newHeight}`;
            } else {
                DOM.dimensionHint.textContent = '请先上传';
            }
        } else if (e.target.value === 'custom') {
            DOM.dimensionCustomRow.style.display = 'block';
            DOM.dimensionPercentRow.style.display = 'none';
            if (state.imageDimension) {
                DOM.customWidth.value = state.imageDimension.width;
                DOM.customHeight.value = state.imageDimension.height;
            }
            DOM.dimensionHint.textContent = '输入自定义尺寸';
        }
    });

    // 缩放比例滑块
    DOM.scalePercent?.addEventListener('input', (e) => {
        state.dimension.scalePercent = parseInt(e.target.value, 10);
        DOM.scaleValueText.textContent = e.target.value;
        if (state.imageDimension) {
            const newWidth = Math.round(state.imageDimension.width * state.dimension.scalePercent / 100);
            const newHeight = Math.round(state.imageDimension.height * state.dimension.scalePercent / 100);
            DOM.dimensionHint.textContent = `输出尺寸: ${newWidth} × ${newHeight}`;
        }
    });

    // 自定义宽度输入
    DOM.customWidth?.addEventListener('input', (e) => {
        const width = parseInt(e.target.value, 10);
        if (width > 0 && state.dimension.ratioLocked && state.imageDimension) {
            const ratio = state.imageDimension.height / state.imageDimension.width;
            DOM.customHeight.value = Math.round(width * ratio);
        }
    });

    // 自定义高度输入
    DOM.customHeight?.addEventListener('input', (e) => {
        const height = parseInt(e.target.value, 10);
        if (height > 0 && state.dimension.ratioLocked && state.imageDimension) {
            const ratio = state.imageDimension.width / state.imageDimension.height;
            DOM.customWidth.value = Math.round(height * ratio);
        }
    });

    // 锁定比例按钮
    DOM.lockRatio?.addEventListener('click', () => {
        state.dimension.ratioLocked = !state.dimension.ratioLocked;
        DOM.lockRatio.classList.toggle('locked', state.dimension.ratioLocked);
        showToast(state.dimension.ratioLocked ? '已锁定宽高比例' : '已解锁宽高比例', 'success', 1500);
    });

    // ========================================
    // 滑动对比功能
    // ========================================

    function enterCompareMode() {
        if (!state.single.blob) return;

        state.compare.active = true;
        state.compare.position = 50;

        // 设置图片源
        DOM.compareOriginal.src = DOM.originalPreview.src;
        DOM.compareCompressed.src = DOM.compressedPreview.src;

        // 设置大小标签
        DOM.compareOriginalSize.textContent = formatSize(state.single.file.size);
        DOM.compareCompressedSize.textContent = formatSize(state.single.blob.size);

        // 切换显示
        DOM.normalPreview.style.display = 'none';
        DOM.compareContainer.style.display = 'block';
        DOM.compareModeBtn.style.display = 'none';

        // 初始化滑块位置
        updateComparePosition(50);

        showToast('滑动对比模式，拖动中间滑块查看差异', 'success', 3000);
    }

    function updateComparePosition(percent) {
        state.compare.position = percent;
        DOM.compareSlider.style.left = `${percent}%`;
        // compareCompressed 的父元素是 .compare-image-compressed
        const compressedContainer = DOM.compareCompressed.closest('.compare-image-compressed');
        if (compressedContainer) {
            compressedContainer.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        }
    }

    function handleCompareDrag(e) {
        if (!state.compare.active) return;

        const wrapper = DOM.compareContainer.querySelector('.compare-wrapper');
        const rect = wrapper.getBoundingClientRect();
        let percent;

        if (e.type.startsWith('touch')) {
            percent = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
        } else {
            percent = ((e.clientX - rect.left) / rect.width) * 100;
        }

        percent = Math.max(5, Math.min(95, percent));
        updateComparePosition(percent);
    }

    // 滑动对比按钮
    DOM.compareModeBtn?.addEventListener('click', enterCompareMode);
    DOM.exitCompareBtn?.addEventListener('click', exitCompareMode);

    // 滑块拖动
    const compareWrapper = document.querySelector('.compare-wrapper');
    if (compareWrapper) {
        compareWrapper.addEventListener('mousedown', handleCompareDrag);
        compareWrapper.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) handleCompareDrag(e);
        });
        compareWrapper.addEventListener('touchstart', handleCompareDrag);
        compareWrapper.addEventListener('touchmove', handleCompareDrag);
    }

    // 图片预览弹窗 - 点击图片放大
    DOM.originalPreview?.addEventListener('click', () => {
        if (DOM.originalPreview.src) {
            showImageModal(DOM.originalPreview.src);
        }
    });

    DOM.compressedPreview?.addEventListener('click', () => {
        if (DOM.compressedPreview.src) {
            showImageModal(DOM.compressedPreview.src);
        }
    });

    // 批量列表图片点击（使用事件委托）
    DOM.batchList?.addEventListener('click', (e) => {
        const img = e.target.closest('.batch-item-preview img');
        if (img && img.src) {
            showImageModal(img.src);
        }
    });

    // 关闭弹窗
    DOM.modalClose?.addEventListener('click', closeImageModal);
    DOM.modalBackdrop?.addEventListener('click', closeImageModal);

    // 历史记录悬浮按钮 (移动端) - 点击切换显示/隐藏
    DOM.historyFab?.addEventListener('click', toggleHistorySidebar);

    // 历史记录清空
    DOM.historyClear?.addEventListener('click', clearHistory);

    // 点击页面其他区域关闭历史侧边栏
    document.addEventListener('click', (e) => {
        // 移动端遮罩点击关闭
        if (e.target.id === 'historyOverlay') {
            hideHistorySidebar();
            return;
        }

        // PC端点击侧边栏外部关闭
        if (window.innerWidth > 768 && DOM.historySidebar.classList.contains('show')) {
            const isClickInside = DOM.historySidebar.contains(e.target) ||
                                   DOM.historyFab.contains(e.target);
            if (!isClickInside) {
                hideHistorySidebar();
            }
        }
    });

    // 历史记录下载、删除和预览
    DOM.historyList?.addEventListener('click', async (e) => {
        // 下载按钮
        const downloadBtn = e.target.closest('.history-item-download');
        if (downloadBtn) {
            const index = parseInt(downloadBtn.dataset.index, 10);
            const id = parseInt(downloadBtn.dataset.id, 10);
            const item = state.history[index];
            if (item) {
                const blob = await getBlobFromDB(id);
                if (blob) {
                    downloadBlob(blob, item.fileName);
                    showToast('下载成功', 'success');
                } else {
                    showToast('历史记录已过期，请重新压缩', 'warning', 4000);
                }
            }
            return;
        }

        // 删除按钮
        const deleteBtn = e.target.closest('.history-item-delete');
        if (deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index, 10);
            await deleteHistoryItem(index);
            return;
        }

        // 点击历史项图片放大
        const img = e.target.closest('.history-item-preview img');
        if (img && img.src) {
            showImageModal(img.src);
        }
    });

    // 回车触发压缩
    DOM.targetSize.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !state.single.isCompressing && !state.batch.isCompressing) {
            if (state.mode === 'batch' && state.batch.files.length > 0) {
                compressBatch();
            } else if (state.single.file) {
                compressSingle();
            }
        }
    });

    // 快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S 下载
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (state.mode === 'batch' && state.batch.results.length > 0) {
                downloadBatchAll();
            } else if (state.single.blob) {
                downloadSingle();
            }
        }
        // Escape 关闭各种面板
        if (e.key === 'Escape') {
            if (DOM.imageModal.classList.contains('show')) {
                closeImageModal();
            } else if (DOM.historySidebar.classList.contains('show')) {
                hideHistorySidebar();
            } else {
                clearCurrentData();
            }
        }
    });

    // ========================================
    // 初始化
    // ========================================

    if (typeof Compressor === 'undefined') {
        showToast('压缩库加载失败，请刷新页面', 'error', 5000);
        console.error('Compressor.js not loaded');
    }

    const canvas = document.createElement('canvas');
    if (!canvas.getContext?.('2d') || !canvas.toBlob) {
        showToast('浏览器不支持，请使用现代浏览器', 'error', 0);
    }

    // 初始化 IndexedDB（不加载历史记录，会话结束后清空）
    (async () => {
        await initDB();
        // 清空之前的历史记录，不持久化
        state.history = [];
        updateHistoryUI();
    })();

    // 初始化主题
    Theme.init();

    // 页面关闭时清空 IndexedDB 和 localStorage
    window.addEventListener('beforeunload', async () => {
        await clearDB();
        localStorage.removeItem('picSqueeze_history');
    });

    // 默认单文件模式
    switchMode('single');

    console.log('图片压缩工具已就绪');

})();