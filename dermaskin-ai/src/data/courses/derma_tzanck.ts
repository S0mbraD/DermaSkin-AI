import type { CourseConfig } from '@/types';
import { fmtTime } from '@/utils/format';

export const dermaTzanck: CourseConfig = {
  id: 'derma_tzanck',
  name: 'Tzanck涂片检查',
  shortName: 'Tzanck涂片',
  videoSrc: '/videos/derma_tzanck.mp4',

  rubric: [
    { key: 'sitePrep', label: '取材部位准备', maxScore: 15 },
    { key: 'smearMaking', label: '涂片制备', maxScore: 25 },
    { key: 'staining', label: '染色操作', maxScore: 25 },
    { key: 'microscopyRead', label: '镜下判读', maxScore: 25 },
    { key: 'resultExplain', label: '结果说明与临床意义', maxScore: 10 },
  ],

  evals: {
    1: { scores: [13, 22, 21, 22, 9], timestamps: [8, 40, 100, 165, 225] },
    2: { scores: [12, 19, 19, 19, 8], timestamps: [10, 43, 105, 170, 230] },
    3: { scores: [10, 16, 16, 16, 7], timestamps: [13, 47, 110, 175, 235] },
    4: { scores: [14, 23, 23, 24, 10], timestamps: [6, 36, 95, 158, 218] },
    5: { scores: [8, 14, 13, 13, 5], timestamps: [16, 52, 118, 182, 242] },
    6: { scores: [12, 20, 20, 20, 8], timestamps: [9, 42, 102, 167, 227] },
    7: { scores: [11, 17, 17, 18, 7], timestamps: [12, 45, 107, 172, 232] },
    8: { scores: [7, 13, 12, 12, 5], timestamps: [18, 55, 120, 188, 248] },
  },

  evidenceText: {
    0: {
      excellent: '准确选择新鲜水疱（<24h），沿疱壁底部精准剪破，暴露疱底组织。取材手法轻柔，避免挤压组织。',
      pass: '取材部位选择基本正确，但操作手法不够精确，水疱选择偏老旧。',
      fail: '选择陈旧已破溃的水疱或取材部位不当，无法获取有效标本。',
    },
    1: {
      excellent: '刮取疱底细胞均匀涂布于玻片上，薄而均匀，固定方式规范（自然风干或微焰固定），标本质量良好。',
      pass: '涂片完成但厚薄不均匀，部分区域可能过厚或有细胞团块，基本可供判读。',
      fail: '涂片操作不规范，涂片过厚或细胞团块化严重，严重影响后续染色和判读。',
    },
    2: {
      excellent: '染色液量控制适当，染色时间准确（3~5分钟），冲洗轻柔不损坏涂片，背景干净清晰。',
      pass: '染色步骤基本完成，但染色时间有偏差或冲洗力度稍大，部分区域染色过深。',
      fail: '染色时间严重不足或过长，冲洗操作损坏涂片，无法进行有效判读。',
    },
    3: {
      excellent: '先低倍镜系统扫查，再高倍镜确认多核巨细胞，清晰描述核的毛玻璃样形态特点。识别准确，描述专业。',
      pass: '能识别多核巨细胞的存在，但形态描述不够精确，可能混淆部分细胞类型。',
      fail: '未能识别多核巨细胞或将正常细胞误判，缺乏有效的镜下判读能力。',
    },
    4: {
      excellent: '准确说明阳性结果支持疱疹病毒感染（但不能区分HSV/VZV），建议结合培养或PCR确诊。解释清晰完整。',
      pass: '基本说明了阳性结果意义，但未提及后续确诊检查方案。',
      fail: '结果解读错误或未能正确阐述Tzanck涂片的临床意义和局限性。',
    },
  },

  getLevel: (score: number, maxScore: number) => {
    const pct = score / maxScore;
    return pct >= 0.85 ? 'excellent' : pct >= 0.6 ? 'pass' : 'fail';
  },

  aiSuggestionGen: (studentName, total, weakDims, evalData) => {
    const grade = total >= 90 ? '优秀' : total >= 80 ? '良好' : total >= 70 ? '合格' : '需加强';
    let text = `本次Tzanck涂片检查操作表现${grade}，${studentName}同学总分${total}/100分。`;

    if (weakDims.length > 0) {
      const w = weakDims[0];
      const ts = evalData?.timestamps[w.idx];
      text += `\n\n在「${w.label}」方面存在提升空间（${w.score}/${w.maxScore}分），`;
      if (ts) text += `视频 ${fmtTime(ts)} 处可观察到操作细节需改进。`;
      text += `建议加强涂片制备和染色操作的规范化训练。`;
    }

    text += `\n\n建议后续训练重点：`;
    text += `①练习涂片制备手法，确保薄而均匀的涂布效果；`;
    text += `②反复练习Wright/吉姆萨染色操作，掌握时间控制；`;
    text += `③收集典型多核巨细胞镜下图像进行辨识训练。`;

    return text;
  },
};
