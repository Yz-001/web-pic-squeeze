# web-pic-squeeze

一个简洁高效的浏览器端图片压缩工具，支持单张和批量压缩，所有处理在本地完成，无需上传服务器。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

**💡 简单易用：纯 HTML 项目，双击 `index.html` 即可打开使用，无需安装任何依赖或构建工具。**

## ✨ 特性

- 🖼️ **单张/批量压缩** - 支持单张图片压缩和最多 20 张批量处理
- 🎯 **目标大小控制** - 可指定压缩后的目标文件大小
- 📐 **尺寸调整** - 支持保持原尺寸、按比例缩放、自定义尺寸
- 🔄 **格式转换** - 支持 JPEG、PNG、WebP 输出格式
- 👀 **实时对比** - 滑动对比原图与压缩后的效果
- 🔒 **隐私安全** - 所有处理在浏览器本地完成，不上传服务器
- 🌓 **明暗主题** - 支持明亮/暗色主题切换
- ⌨️ **快捷键** - Ctrl+V 粘贴上传、Enter 快速压缩、Ctrl+S 下载
- 📱 **响应式** - 完美适配桌面端和移动端

## 🚀 快速开始

**直接使用**：双击 `index.html` 用浏览器打开即可使用，无需安装任何依赖。

**克隆使用**：
```bash
git clone git@github.com:Yz-001/web-pic-squeeze.git
cd web-pic-squeeze
# 直接用浏览器打开 index.html
```

## 📖 使用说明

### 单张压缩

1. 点击上传区域或拖拽图片
2. 支持 Ctrl+V 粘贴剪贴板图片
3. 设置目标大小（留空则自动压缩）
4. 选择输出格式和尺寸模式
5. 点击「开始压缩」
6. 查看压缩结果并下载

### 批量压缩

1. 切换到「批量压缩」模式
2. 选择多张图片（最多 20 张）
3. 设置统一的压缩参数
4. 点击「开始压缩」逐张处理
5. 单张下载或全部下载

### 滑动对比

压缩完成后，点击「滑动对比」按钮，通过拖动滑块查看原图与压缩图的差异对比。

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + V` | 粘贴上传图片 |
| `Enter` | 开始压缩 |
| `Ctrl + S` | 下载结果 |
| `Esc` | 清空重置 |

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **压缩引擎**: [Compressor.js](https://github.com/fengyuanchen/compressorjs)
- **存储**: IndexedDB + localStorage（会话级历史记录）
- **样式**: CSS 变量实现主题切换

## 📁 项目结构

```
web-pic-squeeze/
├── index.html          # 主页面
├── css/
│   └── styles.css      # 样式文件（含明暗主题）
├── js/
│   └── app.js          # 核心逻辑
├── img/
│   └── mark.svg        # Logo 图标
└── README.md           # 项目说明
```

## 🎨 主题切换

点击导航栏右侧的主题切换按钮，可在明亮模式和暗色模式之间切换：

- **明亮模式**: 浅灰色背景，适合日间使用
- **暗色模式**: 深色背景，减少视觉疲劳

主题设置会自动保存，下次访问自动恢复。

## 📝 注意事项

- 压缩处理完全在浏览器本地进行，大图片可能需要较长时间
- 建议使用现代浏览器（Chrome、Firefox、Edge、Safari）
- 历史记录仅在当前会话有效，关闭页面后自动清空
- 批量压缩时，目标大小应用于所有图片

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Compressor.js](https://github.com/fengyuanchen/compressorjs) - 图片压缩核心库