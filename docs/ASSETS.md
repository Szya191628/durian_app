# 视觉资产来源

- `assets/images/durian-editorial.jpg`：内置 imagegen 生成的品牌装饰图。不是具体商品实拍；页面标注「品牌创意配图」。生成后仅进行 JPEG 压缩编码，原始尺寸 1536 × 1024，未改变图像构图。
- `assets/icons/*.png`：本项目自绘线性图标，统一 64 × 64，绿色、灰色、白色三种语义状态。
- 真实商品图：读取 products.images，管理端支持上传，缺失时显示占位说明。

生成提示词：

> Create one premium editorial food brand photograph, wide landscape 1536x1024. A freshly split durian with natural olive green spiky rind and abundant golden yellow soft flesh on a matte warm ivory surface. One smaller golden durian flesh segment rests beside it; a subtle real dark green leaf behind. Entire fruit group on RIGHT two thirds, LEFT third airy empty cream background. Soft directional morning studio light, grounded natural soft shadows, tactile macro details, elegant restrained luxury grocery art direction, palette warm ivory, muted forest green, golden durian. No text, no logos, no badges, no packaging, no humans. This is a decorative brand mood image for a durian e-commerce app, not a representation of a specific product.
