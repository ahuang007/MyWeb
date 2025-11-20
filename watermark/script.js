document.addEventListener('DOMContentLoaded', () => {
    console.log('图片水印工具已加载');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const originalCanvas = document.getElementById('originalCanvas');
    const watermarkedCanvas = document.getElementById('watermarkedCanvas');
    const applyButton = document.getElementById('applyWatermark');
    const downloadButton = document.getElementById('downloadImage');
    const resetButton = document.getElementById('resetImage');
    const messageArea = document.getElementById('messageArea');
    
    // 水印设置元素
    const watermarkText = document.getElementById('watermarkText');
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const rotation = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotationValue');
    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacityValue');
    const watermarkColor = document.getElementById('watermarkColor');
    const colorValue = document.getElementById('colorValue');
    const position = document.getElementById('position');
    const fontFamily = document.getElementById('fontFamily');
    
    // 全局变量
    let currentImage = null;
    let originalImageData = null;
    
    // 初始化事件监听器
    initEventListeners();
    
    function initEventListeners() {
        // 文件上传事件
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
        
        // 水印设置事件
        watermarkText.addEventListener('input', updatePreview);
        fontSize.addEventListener('input', updateFontSizeDisplay);
        rotation.addEventListener('input', updateRotationDisplay);
        opacity.addEventListener('input', updateOpacityDisplay);
        watermarkColor.addEventListener('input', updateColorDisplay);
        position.addEventListener('change', updatePreview);
        fontFamily.addEventListener('change', updatePreview);
        
        // 按钮事件
        applyButton.addEventListener('click', applyWatermark);
        downloadButton.addEventListener('click', downloadImage);
        resetButton.addEventListener('click', resetImage);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }
    
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    }
    
    function handleFile(file) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            showMessage('请选择有效的图片文件！', 'error');
            return;
        }
        
        // 验证文件大小（10MB限制）
        if (file.size > 10 * 1024 * 1024) {
            showMessage('文件大小不能超过10MB！', 'error');
            return;
        }
        
        // 读取并显示图片
        const reader = new FileReader();
        reader.onload = function(e) {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
    
    function loadImage(src) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            displayImage(img);
            showMessage('图片加载成功！', 'success');
        };
        img.onerror = function() {
            showMessage('图片加载失败，请重试！', 'error');
        };
        img.src = src;
    }
    
    function displayImage(img) {
        // 设置画布尺寸
        const maxWidth = 400;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        // 设置原始图片画布
        originalCanvas.width = width;
        originalCanvas.height = height;
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, width, height);
        
        // 设置水印画布
        watermarkedCanvas.width = width;
        watermarkedCanvas.height = height;
        
        // 保存原始图片数据
        originalImageData = originalCtx.getImageData(0, 0, width, height);
        
        // 显示预览区域
        previewSection.style.display = 'block';
        
        // 启用按钮
        applyButton.disabled = false;
        
        // 应用初始水印
        updatePreview();
    }
    
    function updateFontSizeDisplay() {
        fontSizeValue.textContent = fontSize.value;
        updatePreview();
    }
    
    function updateRotationDisplay() {
        rotationValue.textContent = rotation.value;
        updatePreview();
    }
    
    function updateOpacityDisplay() {
        opacityValue.textContent = opacity.value;
        updatePreview();
    }
    
    function updateColorDisplay() {
        colorValue.value = watermarkColor.value;
        updatePreview();
    }
    
    function applyWatermark() {
        if (!currentImage) {
            showMessage('请先上传图片！', 'error');
            return;
        }
        
        const canvas = watermarkedCanvas;
        const ctx = canvas.getContext('2d');
        
        // 清空画布并重新绘制原图
        ctx.putImageData(originalImageData, 0, 0);
        
        // 获取水印设置
        const text = watermarkText.value;
        const size = parseInt(fontSize.value);
        const angle = parseInt(rotation.value);
        const alpha = parseInt(opacity.value) / 100;
        const color = watermarkColor.value;
        const pos = position.value;
        const font = fontFamily.value;
        
        if (!text.trim()) {
            showMessage('请输入水印文字！', 'error');
            return;
        }
        
        // 设置水印样式
        ctx.font = `${size}px ${font}`;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        if (pos === 'repeat') {
            // 平铺水印
            drawTiledWatermark(ctx, text, size, angle);
        } else {
            // 单个水印
            drawSingleWatermark(ctx, text, size, angle, pos);
        }
        
        // 恢复透明度
        ctx.globalAlpha = 1;
        
        // 启用下载按钮
        downloadButton.disabled = false;
        
        showMessage('水印应用成功！', 'success');
    }
    
    function drawTiledWatermark(ctx, text, size, angle) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // 计算文本尺寸
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = size;
        
        // 设置旋转和平移
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-width / 2, -height / 2);
        
        // 计算平铺间距
        const spacing = Math.max(textWidth + 50, textHeight + 50);
        const cols = Math.ceil(width / spacing) + 2;
        const rows = Math.ceil(height / spacing) + 2;
        
        // 绘制平铺水印
        for (let row = -1; row <= rows; row++) {
            for (let col = -1; col <= cols; col++) {
                const x = col * spacing;
                const y = row * spacing;
                ctx.fillText(text, x, y);
            }
        }
        
        ctx.restore();
    }
    
    function drawSingleWatermark(ctx, text, size, angle, pos) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // 计算文本尺寸
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = size;
        
        // 设置旋转
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-width / 2, -height / 2);
        
        // 根据位置计算坐标
        let x, y;
        switch (pos) {
            case 'center':
                x = (width - textWidth) / 2;
                y = height / 2;
                break;
            case 'top-left':
                x = 20;
                y = textHeight + 20;
                break;
            case 'top-right':
                x = width - textWidth - 20;
                y = textHeight + 20;
                break;
            case 'bottom-left':
                x = 20;
                y = height - 20;
                break;
            case 'bottom-right':
                x = width - textWidth - 20;
                y = height - 20;
                break;
            default:
                x = (width - textWidth) / 2;
                y = height / 2;
        }
        
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    
    function updatePreview() {
        if (!currentImage) return;
        
        const canvas = watermarkedCanvas;
        const ctx = canvas.getContext('2d');
        
        // 清空画布并重新绘制原图
        ctx.putImageData(originalImageData, 0, 0);
        
        // 获取水印设置
        const text = watermarkText.value;
        if (!text.trim()) return;
        
        const size = parseInt(fontSize.value);
        const angle = parseInt(rotation.value);
        const alpha = parseInt(opacity.value) / 100;
        const color = watermarkColor.value;
        const pos = position.value;
        const font = fontFamily.value;
        
        // 设置水印样式
        ctx.font = `${size}px ${font}`;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        
        if (pos === 'repeat') {
            // 平铺水印
            drawTiledWatermark(ctx, text, size, angle);
        } else {
            // 单个水印
            drawSingleWatermark(ctx, text, size, angle, pos);
        }
        
        // 恢复透明度
        ctx.globalAlpha = 1;
    }
    
    function downloadImage() {
        if (!currentImage) {
            showMessage('没有可下载的图片！', 'error');
            return;
        }
        
        const canvas = watermarkedCanvas;
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `watermarked_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showMessage('图片下载成功！', 'success');
    }
    
    function resetImage() {
        // 重置变量
        currentImage = null;
        originalImageData = null;
        
        // 清空画布
        originalCanvas.width = 0;
        originalCanvas.height = 0;
        watermarkedCanvas.width = 0;
        watermarkedCanvas.height = 0;
        
        // 重置表单
        fileInput.value = '';
        watermarkText.value = 'henry publish';
        fontSize.value = 24;
        fontSizeValue.textContent = '24';
        rotation.value = -30;
        rotationValue.textContent = '-30';
        opacity.value = 30;
        opacityValue.textContent = '30';
        watermarkColor.value = '#ffffff';
        colorValue.value = '#ffffff';
        position.value = 'repeat';
        fontFamily.value = 'Arial';
        
        // 隐藏预览区域
        previewSection.style.display = 'none';
        
        // 禁用按钮
        applyButton.disabled = true;
        downloadButton.disabled = true;
        
        // 清空消息
        messageArea.innerHTML = '';
        
        showMessage('已重置，请重新上传图片！', 'info');
    }
    
    function showMessage(message, type) {
        messageArea.innerHTML = `
            <div class="message ${type}">
                ${message}
            </div>
        `;
        
        // 3秒后自动清除消息
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 3000);
    }
});