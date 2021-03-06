const fs = require("fs");
const path = require("path");

const pMap = require("p-map");
const run = require("runscript");

const { getMarkdownFiles, imageUrlGen, getImageFileName } = require("./tool");

// 入口函数
const main = async () => {
  const [, , sourceDir, targetDir] = process.argv;

  const files = await getMarkdownFiles(sourceDir);
  const imageUrls = [...imageUrlGen(sourceDir, files)];

  const concurrency = 20;
  await pMap(
    imageUrls,
    async ({ dir, imageUrl }) => {
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
      await download(imageUrl, distDir, imageFileName);
    },
    { concurrency }
  );
};

const download = (() => {
  let retry = 10;

  return async (imageUrl, distDir, imageFileName) => {
    const script = `curl -o ${imageFileName} "${decodeURIComponent(imageUrl)}"`;

    try {
      await run(script, {
        cwd: distDir,
        stdio: "pipe",
      });
    } catch (err) {
      retry--;
      if (retry === 0) {
        throw err;
      }

      await run(script, {
        cwd: distDir,
        stdio: "pipe",
      });
    }
  };
})();

main();
