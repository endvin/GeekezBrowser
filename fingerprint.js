const os = require('os');
const CHROME_VERSION_FULL = '129.0.6668.58';
const CHROME_MAJOR = '129';

const RESOLUTIONS = [{ w: 1920, h: 1080 }, { w: 2560, h: 1440 }, { w: 1366, h: 768 }, { w: 1536, h: 864 }, { w: 1440, h: 900 }];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateFingerprint() {
    // 1. 强制匹配宿主机系统
    const platform = os.platform();

    let osData = {};

    if (platform === 'win32') {
        osData = {
            userAgentStr: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION_FULL} Safari/537.36`,
            platform: 'Win32',
            uaPlatform: 'Windows',
            platformVersion: '15.0.0'
        };
    } else if (platform === 'darwin') {
        osData = {
            userAgentStr: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION_FULL} Safari/537.36`,
            platform: 'MacIntel',
            uaPlatform: 'macOS',
            platformVersion: '14.0.0'
        };
    } else {
        osData = {
            userAgentStr: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION_FULL} Safari/537.36`,
            platform: 'Linux x86_64',
            uaPlatform: 'Linux',
            platformVersion: '6.5.0'
        };
    }

    const res = getRandom(RESOLUTIONS);
    const languages = ['en-US', 'en'];

    const canvasNoise = {
        r: Math.floor(Math.random() * 10) - 5,
        g: Math.floor(Math.random() * 10) - 5,
        b: Math.floor(Math.random() * 10) - 5,
        a: Math.floor(Math.random() * 10) - 5
    };

    const userAgentMetadata = {
        brands: [
            { brand: "Google Chrome", version: CHROME_MAJOR },
            { brand: "Chromium", version: CHROME_MAJOR },
            { brand: "Not=A?Brand", version: "24" }
        ],
        fullVersionList: [
            { brand: "Google Chrome", version: CHROME_VERSION_FULL },
            { brand: "Chromium", version: CHROME_VERSION_FULL },
            { brand: "Not=A?Brand", version: "24.0.0.0" }
        ],
        mobile: false,
        model: "",
        platform: osData.uaPlatform,
        platformVersion: osData.platformVersion,
        architecture: "x86",
        bitness: "64",
        wow64: false
    };

    const mathNoise = (Math.random() - 0.5) * 0.0000002; // ±0.0000001
    const baseLatencyNoise = (Math.random() - 0.5) * 0.002; // ±0.001

    // 随机色域
    const gamutRoll = Math.random();
    const colorGamut = gamutRoll < 0.8 ? 'srgb' : (gamutRoll < 0.99 ? 'p3' : 'rec2020');

    // 媒体查询随机化
    const mediaQueries = {
        'color-gamut': colorGamut,
        'prefers-reduced-motion': Math.random() < 0.1 ? 'reduce' : 'no-preference',
        'prefers-contrast': Math.random() < 0.05 ? 'more' : 'no-preference',
        'hdr': Math.random() < 0.1
    };

    // 触摸点支持 (Windows/Linux 随机化，macOS 保持 0)
    let maxTouchPoints = 0;
    if (platform !== 'darwin' && Math.random() < 0.3) {
        maxTouchPoints = Math.random() < 0.5 ? 1 : 5;
    }

    return {
        userAgent: osData.userAgentStr,
        userAgentMetadata: userAgentMetadata,
        platform: osData.platform,
        screen: { width: res.w, height: res.h },
        window: { width: res.w, height: res.h },
        languages: languages,
        hardwareConcurrency: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        deviceMemory: [4, 8, 16][Math.floor(Math.random() * 3)],
        canvasNoise: canvasNoise,
        audioNoise: Math.random() * 0.000001,
        mathNoise: mathNoise,
        baseLatencyNoise: baseLatencyNoise,
        mediaQueries: mediaQueries,
        maxTouchPoints: maxTouchPoints,
        noiseSeed: Math.floor(Math.random() * 9999999),
        timezone: "America/Los_Angeles" // 默认值
    };
}

// 注入脚本：包含复杂的时区伪装逻辑
function getInjectScript(fp, profileName, watermarkStyle) {
    const fpJson = JSON.stringify(fp);
    const safeProfileName = (profileName || 'Profile').replace(/[<>"'&]/g, ''); // 防止 XSS
    const style = watermarkStyle || 'enhanced'; // 默认使用增强水印
    return `
    (function() {
        try {
            const fp = ${fpJson};
            const targetTimezone = fp.timezone || "America/Los_Angeles";

            // --- 0. Stealth System (WeakMap based toString) ---
            const fakeFunctions = new WeakMap();
            const originalToString = Function.prototype.toString;
            
            const newToString = function toString() {
                if (typeof this === 'function' && fakeFunctions.has(this)) {
                    return "function " + fakeFunctions.get(this) + "() { [native code] }";
                }
                return originalToString.call(this);
            };

            Object.defineProperty(newToString, 'name', { value: 'toString', configurable: true });
            fakeFunctions.set(newToString, 'toString');
            Function.prototype.toString = newToString;

            const makeNative = (func, name) => {
                fakeFunctions.set(func, name);
                return func;
            };

            // --- 1. 移除 WebDriver 及 Puppeteer 特征 ---
            if ('webdriver' in Navigator.prototype) {
                Object.defineProperty(Navigator.prototype, 'webdriver', {
                    get: makeNative(function() { return false; }, 'get webdriver'),
                    configurable: true
                });
            }

            const cdcRegex = /cdc_[a-zA-Z0-9]+/;
            for (const key in window) {
                if (cdcRegex.test(key)) {
                    try { delete window[key]; } catch(e) {}
                }
            }
            ['$cdc_asdjflasutopfhvcZLmcfl_', '$chrome_asyncScriptInfo', 'callPhantom'].forEach(k => {
                 if (window[k]) try { delete window[k]; } catch(e) {}
            });
            Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: false,
                value: { app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } }, runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } } }
            });


            // --- 2. Stealth Geolocation Hook (Prototype Pattern) ---
            if (fp.geolocation) {
                const { latitude, longitude } = fp.geolocation;
                const accuracy = 500 + (fp.noiseSeed % 1000);

                const fakeGetCurrentPosition = function getCurrentPosition(success) {
                    const pos = {
                        coords: {
                            latitude: latitude + (Math.random() - 0.5) * 0.005,
                            longitude: longitude + (Math.random() - 0.5) * 0.005,
                            accuracy: accuracy,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    };
                    setTimeout(() => success(pos), 10);
                };

                const fakeWatchPosition = function watchPosition(s) {
                    fakeGetCurrentPosition(s);
                    return 1;
                };

                Object.defineProperty(Geolocation.prototype, 'getCurrentPosition', {
                    value: makeNative(fakeGetCurrentPosition, 'getCurrentPosition'),
                    configurable: true,
                    writable: true
                });

                Object.defineProperty(Geolocation.prototype, 'watchPosition', {
                    value: makeNative(fakeWatchPosition, 'watchPosition'),
                    configurable: true,
                    writable: true
                });
            }

            // --- 3. Intl API Language Override ---
            if (fp.language && fp.language !== 'auto') {
                const targetLang = fp.language;
                const ODTF = Intl.DateTimeFormat;
                const ONF = Intl.NumberFormat;
                const OColl = Intl.Collator;
                
                Intl.DateTimeFormat = makeNative(function DateTimeFormat(locales, options) {
                    if (!(this instanceof DateTimeFormat)) return ODTF(locales || targetLang, options);
                    return new ODTF(locales || targetLang, options);
                }, 'DateTimeFormat');
                Intl.DateTimeFormat.prototype = ODTF.prototype;
                
                Intl.NumberFormat = makeNative(function NumberFormat(locales, options) {
                    if (!(this instanceof NumberFormat)) return ONF(locales || targetLang, options);
                    return new ONF(locales || targetLang, options);
                }, 'NumberFormat');
                Intl.NumberFormat.prototype = ONF.prototype;
                
                Intl.Collator = makeNative(function Collator(locales, options) {
                    if (!(this instanceof Collator)) return OColl(locales || targetLang, options);
                    return new OColl(locales || targetLang, options);
                }, 'Collator');
                Intl.Collator.prototype = OColl.prototype;
            }

            // --- 3. Canvas Noise ---
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = makeNative(function getImageData(x, y, w, h) {
                const imageData = originalGetImageData.apply(this, arguments);
                if (fp.noiseSeed) {
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        if ((i + fp.noiseSeed) % 53 === 0) {
                            const noise = fp.canvasNoise ? (fp.canvasNoise.a || 0) : 0;
                            imageData.data[i+3] = Math.max(0, Math.min(255, imageData.data[i+3] + noise));
                        }
                    }
                }
                return imageData;
            }, 'getImageData');

            // --- 4. Audio Noise ---
            const origGCD = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = makeNative(function getChannelData(c) {
                const res = origGCD.apply(this, arguments);
                const n = fp.audioNoise || 0.0000001;
                const seed = fp.noiseSeed || 1;
                // 用 seed 混合索引，确保不同环境生成不同强度的确定性微噪
                for (let i = 0; i < 100 && i < res.length; i++) {
                    const h = Math.abs((Math.sin(i * 1e3 + seed) * 1e4) % 1);
                    res[i] += (h - 0.5) * n;
                }
                return res;
            }, 'getChannelData');

            // --- 5. Math Object Noise (Deterministic & Stable) ---
            const mathNoise = fp.mathNoise || 0;
            const seed = fp.noiseSeed || 1;
            const oSin = Math.sin;
            ['acos', 'acosh', 'asin', 'asinh', 'atanh', 'atan', 'sin', 'sinh', 'cos', 'cosh', 'tan', 'tanh'].forEach(fn => {
                const orig = Math[fn];
                Math[fn] = makeNative(function(x) {
                    const v = orig(x);
                    if (v === 0 || v === 1 || v === -1) return v;
                    const h = Math.abs((oSin(v * 1e6 + seed) * 1e4) % 1);
                    return v + (h - 0.5) * mathNoise;
                }, fn);
            });

            // --- 6. Media Queries Hook (Prototype Pattern) ---
            const mqD = Object.getOwnPropertyDescriptor(MediaQueryList.prototype, 'matches');
            if (mqD) {
                const oMQ = mqD.get;
                Object.defineProperty(MediaQueryList.prototype, 'matches', {
                    get: makeNative(function() {
                        const q = (this.media || "").toLowerCase();
                        for (const [k, v] of Object.entries(fp.mediaQueries || {})) {
                            if (q.includes(k)) {
                                if (typeof v === 'boolean') return v;
                                return q.includes(v);
                            }
                        }
                        return oMQ.call(this);
                    }, 'get matches'),
                    configurable: true
                });
            }

            // --- 7. AudioContext.baseLatency Hook (Prototype Pattern) ---
            if (window.AudioContext) {
                const alD = Object.getOwnPropertyDescriptor(AudioContext.prototype, 'baseLatency');
                if (alD) {
                    const oBL = alD.get;
                    const nL = fp.baseLatencyNoise || 0;
                    Object.defineProperty(AudioContext.prototype, 'baseLatency', {
                        get: makeNative(function() {
                            return oBL.call(this) + nL;
                        }, 'get baseLatency'),
                        configurable: true
                    });
                }
            }

            // --- 8. Navigator Prototype Hooks ---
            if (fp.maxTouchPoints !== undefined) {
                Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
                    get: makeNative(function() { return fp.maxTouchPoints; }, 'get maxTouchPoints'),
                    configurable: true
                });
            }
            if (fp.deviceMemory !== undefined) {
                Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                    get: makeNative(function() { return fp.deviceMemory; }, 'get deviceMemory'),
                    configurable: true
                });
            }
            if (fp.hardwareConcurrency !== undefined) {
                Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                    get: makeNative(function() { return fp.hardwareConcurrency; }, 'get hardwareConcurrency'),
                    configurable: true
                });
            }

            // --- 9. WebRTC Protection ---
            const originalPC = window.RTCPeerConnection;
            window.RTCPeerConnection = makeNative(function RTCPeerConnection(config) {
                if(!config) config = {};
                config.iceTransportPolicy = 'relay'; 
                return new originalPC(config);
            }, 'RTCPeerConnection');
            window.RTCPeerConnection.prototype = originalPC.prototype;
            window.RTCPeerConnection.prototype.constructor = window.RTCPeerConnection;

            // --- 6. 浮动水印（显示环境名称）---
            // 根据用户设置选择水印样式
            const watermarkStyle = '${style}';
            
            function createWatermark() {
                try {
                    // 检查是否已存在水印（避免重复创建）
                    if (document.getElementById('geekez-watermark')) return;
                    
                    // 确保 body 存在
                    if (!document.body) {
                        setTimeout(createWatermark, 50);
                        return;
                    }
                    
                    if (watermarkStyle === 'banner') {
                        // 方案1: 顶部横幅
                        const banner = document.createElement('div');
                        banner.id = 'geekez-watermark';
                        banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5)); backdrop-filter: blur(10px); color: white; padding: 5px 20px; text-align: center; font-size: 12px; font-weight: 500; z-index: 2147483647; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: monospace;';
                        
                        const icon = document.createElement('span');
                        icon.textContent = '🔹';
                        icon.style.cssText = 'font-size: 14px;';
                        
                        const text = document.createElement('span');
                        text.textContent = '环境：${safeProfileName}';
                        
                        const closeBtn = document.createElement('button');
                        closeBtn.textContent = '×';
                        closeBtn.style.cssText = 'position: absolute; right: 10px; background: rgba(255,255,255,0.2); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; transition: background 0.2s; font-family: monospace;';
                        closeBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.3)'; };
                        closeBtn.onmouseout = function() { this.style.background = 'rgba(255,255,255,0.2)'; };
                        closeBtn.onclick = function() { banner.style.display = 'none'; };
                        
                        banner.appendChild(icon);
                        banner.appendChild(text);
                        banner.appendChild(closeBtn);
                        document.body.appendChild(banner);
                        
                    } else {
                        // 方案5: 增强水印 (默认)
                        const watermark = document.createElement('div');
                        watermark.id = 'geekez-watermark';
                        watermark.style.cssText = 'position: fixed; bottom: 16px; right: 16px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5)); backdrop-filter: blur(10px); color: white; padding: 10px 16px; border-radius: 8px; font-size: 15px; font-weight: 600; z-index: 2147483647; pointer-events: none; user-select: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); display: flex; align-items: center; gap: 8px; font-family: monospace; animation: geekez-pulse 2s ease-in-out infinite;';
                        
                        const icon = document.createElement('span');
                        icon.textContent = '🎯';
                        icon.style.cssText = 'font-size: 18px; animation: geekez-rotate 3s linear infinite;';
                        
                        const text = document.createElement('span');
                        text.textContent = '${safeProfileName}';
                        
                        watermark.appendChild(icon);
                        watermark.appendChild(text);
                        document.body.appendChild(watermark);
                        
                        // 添加动画样式
                        if (!document.getElementById('geekez-watermark-styles')) {
                            const style = document.createElement('style');
                            style.id = 'geekez-watermark-styles';
                            style.textContent = '@keyframes geekez-pulse { 0%, 100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); } 50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6); } } @keyframes geekez-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
                            document.head.appendChild(style);
                        }
                        
                        // 自适应颜色函数（保留之前的功能）
                        function updateWatermarkColor() {
                            try {
                                const rect = watermark.getBoundingClientRect();
                                const x = rect.left + rect.width / 2;
                                const y = rect.top + rect.height / 2;
                                
                                watermark.style.display = 'none';
                                const elementBelow = document.elementFromPoint(x, y) || document.body;
                                watermark.style.display = '';
                                
                                const bgColor = window.getComputedStyle(elementBelow).backgroundColor;
                                const rgb = bgColor.match(/\\d+/g);
                                
                                if (rgb && rgb.length >= 3) {
                                    const r = parseInt(rgb[0]);
                                    const g = parseInt(rgb[1]);
                                    const b = parseInt(rgb[2]);
                                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                                    
                                    // 保持渐变背景，统一使用50%透明度
                                    watermark.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3)';
                                }
                            } catch(e) { /* 忽略错误 */ }
                        }
                        
                        setTimeout(updateWatermarkColor, 100);
                        
                        let colorUpdateTimer;
                        function scheduleColorUpdate() {
                            clearTimeout(colorUpdateTimer);
                            colorUpdateTimer = setTimeout(updateWatermarkColor, 200);
                        }
                        
                        window.addEventListener('scroll', scheduleColorUpdate, { passive: true });
                        window.addEventListener('resize', scheduleColorUpdate, { passive: true });
                        
                        const observer = new MutationObserver(scheduleColorUpdate);
                        observer.observe(document.body, { 
                            attributes: true, 
                            attributeFilter: ['style', 'class'],
                            subtree: true 
                        });
                    }
                    
                } catch(e) { /* 静默失败，不影响页面 */ }
            }
            
            // 立即尝试创建（针对已加载的页面）
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createWatermark);
            } else {
                createWatermark();
            }

        } catch(e) { console.error("FP Error", e); }
    })();
    `;
}

module.exports = { generateFingerprint, getInjectScript };