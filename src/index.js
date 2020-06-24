const fs = require('fs');
const path = require('path');

const download = require('download');
const pMap = require('p-map');
const run = require('runscript');

const { getMarkdownFiles, imageUrlGen, getImageFileName } = require('./tool');

// 入口函数
const main = async () => {
  const [, , sourceDir, targetDir] = process.argv;

  const files = await getMarkdownFiles(sourceDir);
  const imageUrls = [...imageUrlGen(sourceDir, files)];

  const concurrency = 20;
  await pMap(imageUrls, async ({ dir, imageUrl }) => {
    const imageFileName = getImageFileName(imageUrl);

    // 对于不合法的图片地址，不保存
    if (imageFileName == null) {
      return;
    }

    // 确保文件夹存在
    const distDir = path.join(targetDir, dir);
    // 兼容文章标题中出现双引号的情况
    await run(`mkdir -p "${distDir.replace(/"/g, '\\"')}"`);

    // 下载
    const distFile = path.join(distDir, imageFileName);
    const buffer = await download(imageUrl);
    fs.writeFileSync(distFile, buffer);
  }, { concurrency });
};

main();
