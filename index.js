#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 -f [fileId] -t [token] -r [rule]")
  .option("fileId", {
    alias: "f",
    type: "string",
    description: "피그마 파일 ID",
    demandOption: true,
  })
  .option("token", {
    alias: "t",
    type: "string",
    description: "피그마 API 토큰",
    demandOption: true,
  })
  .option("rule", {
    alias: "r",
    type: "string",
    description: "컴포넌트 이름 규칙 (예: 'icon/*', 'NAME=*')",
    default: "Name=",
  })
  .option("output", {
    alias: "o",
    type: "string",
    description: "아이콘이 저장될 디렉토리 경로",
    default: "./icons",
  })
  .help().argv;

const config = {
  fileId: argv.fileId,
  token: argv.token,
  outputDir: argv.output ?? "./icons",
  nameRule: argv.rule,
};

const iconNameMap = {};

// 1. 초기 피그마 파일 정보를 가져옵니다. 트리 형식으로 반환됩니다.
async function getFileData(fileId, token) {
  const response = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
    method: "GET",
    headers: { "X-Figma-Token": token },
  });

  if (!response.ok) {
    throw new Error(
      `피그마 파일 데이터를 가져오지 못했습니다: ${response.statusText}`
    );
  }

  return response.json();
}

function createNameMatcher(rule) {
  // '*'를 정규식 패턴으로 변환
  const pattern = rule
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // 특수문자 이스케이프
    .replace("\\*", ".*"); // *를 .*로 변환
  return new RegExp(pattern);
}

// 2. dfs를 돌며 유효한 컴포넌트만 컴포넌트 아이디를 추출합니다.
function extractComponentIds(fileData) {
  const componentIds = [];
  const nameMatcher = createNameMatcher(config.nameRule);

  const traverseNodes = (node) => {
    if (node.type === "COMPONENT") {
      if (nameMatcher.test(node.name)) {
        componentIds.push(node.id);
        const nameMatch = node.name.split(config.nameRule)[1];
        iconNameMap[node.id] = nameMatch
          ? nameMatch.split(",")[0]
          : node.name.replaceAll("/", "");
      }
    }
    if (node.children) {
      node.children.forEach(traverseNodes);
    }
  };

  traverseNodes(fileData.document);
  return componentIds;
}

// 3. 컴포넌트 아이디를 이용해 svg 이미지 url을 가져옵니다.
async function getSvgUrls(fileId, token, componentIds) {
  const ids = componentIds;
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${ids.join(",")}&format=svg`,
    {
      method: "GET",
      headers: { "X-Figma-Token": token },
    }
  );

  if (!response.ok) {
    throw new Error(
      `SVG URL을 가져오는데 실패했습니다: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.images;
}

// 4. svg 이미지 url을 이용해 svg 파일을 다운로드합니다.
function downloadSvgs(svgUrls, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  Object.entries(svgUrls).forEach(async ([id, url]) => {
    const name = iconNameMap[id] || id;
    try {
      const filePath = path.join(outputDir, `${name}.svg`);
      if (fs.existsSync(filePath)) {
        console.log(`⏭️ ${name}.svg 이미 존재합니다`);
        return;
      }
      const res = await fetch(url);
      const svgText = await res.text();
      const cleanedSvg = svgText.replace(/(width|height)="[^"]*"/g, "");
      fs.writeFileSync(filePath, cleanedSvg);
      console.log(`✅ ${name}.svg 다운로드 완료`);
    } catch (err) {
      console.error(`❌ ${name}.svg 다운로드 실패: ${err.message}`);
    }
  });
}

(async function main() {
  try {
    console.log("🚀 Figma 아이콘 다운로드 시작...");

    // 1. 파일 데이터 가져오기
    const fileData = await getFileData(config.fileId, config.token);
    console.log("📁 파일 데이터 가져오기 성공");

    // 2. 컴포넌트 ID 추출
    const componentIds = extractComponentIds(fileData);
    if (componentIds.length === 0) {
      console.log("⚠️ 컴포넌트가 없습니다.");
      return;
    }
    console.log(`🔍 ${componentIds.length}개의 컴포넌트 발견`);

    // 3. SVG URL 가져오기
    const svgUrls = await getSvgUrls(config.fileId, config.token, componentIds);
    console.log("🔗 SVG URL 가져오기 성공");

    // 4. SVG 다운로드
    downloadSvgs(svgUrls, config.outputDir);
  } catch (err) {
    console.error(`❌ 오류: ${err.message}`);
  }
})();
