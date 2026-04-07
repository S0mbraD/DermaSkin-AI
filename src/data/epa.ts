import type { EPA } from '@/types';

export const EPA_LIST: EPA[] = [
  {
    id: 'epa-derm-1', code: 'EPA-1', name: '无菌操作与个人防护',
    description: '能正确执行皮肤科操作中的无菌技术，包括手卫生、戴手套、消毒铺巾等标准流程，保证操作安全。',
    category: '基础操作', weight: 1.0,
    milestones: [
      { id: 'epa1-l1', level: 1, label: '观察级', criteria: '了解无菌操作的基本原则，能在带教指导下描述标准流程' },
      { id: 'epa1-l2', level: 2, label: '协助级', criteria: '在直接监督下能正确完成手卫生和戴手套操作' },
      { id: 'epa1-l3', level: 3, label: '独立级', criteria: '能独立完成全套无菌操作流程，无明显违规' },
      { id: 'epa1-l4', level: 4, label: '指导级', criteria: '能指导他人的无菌操作并进行质量把控' },
    ],
  },
  {
    id: 'epa-derm-2', code: 'EPA-2', name: '皮肤取材与标本处理',
    description: '能根据不同检查目的选择正确的取材方法，规范采集标本并完成标本固定、标记和送检。',
    category: '基础操作', weight: 1.5,
    milestones: [
      { id: 'epa2-l1', level: 1, label: '观察级', criteria: '了解常见取材方法（刮片、活检、涂片），能描述基本流程' },
      { id: 'epa2-l2', level: 2, label: '协助级', criteria: '在监督下能完成简单标本采集（如真菌刮片）' },
      { id: 'epa2-l3', level: 3, label: '独立级', criteria: '能独立完成多种取材操作，标本质量符合要求' },
      { id: 'epa2-l4', level: 4, label: '指导级', criteria: '能根据复杂临床情况调整取材策略并指导他人' },
    ],
  },
  {
    id: 'epa-derm-3', code: 'EPA-3', name: '真菌镜检制片与判读',
    description: '能完成KOH湿片制备、显微镜操作、菌丝和孢子识别的全过程。',
    category: '诊断技术', weight: 1.5,
    milestones: [
      { id: 'epa3-l1', level: 1, label: '观察级', criteria: '了解KOH湿片制备原理和显微镜基本操作' },
      { id: 'epa3-l2', level: 2, label: '协助级', criteria: '在指导下能完成制片和基本镜下观察' },
      { id: 'epa3-l3', level: 3, label: '独立级', criteria: '能独立完成制片并准确识别菌丝和孢子' },
      { id: 'epa3-l4', level: 4, label: '指导级', criteria: '能识别少见真菌形态并指导初学者镜下判读' },
    ],
  },
  {
    id: 'epa-derm-4', code: 'EPA-4', name: '皮肤活检操作',
    description: '能完成环钻活检或切取活检的全过程，包括麻醉、取材、止血、缝合。',
    category: '诊断技术', weight: 2.0,
    milestones: [
      { id: 'epa4-l1', level: 1, label: '观察级', criteria: '了解活检适应症和基本操作步骤' },
      { id: 'epa4-l2', level: 2, label: '协助级', criteria: '在直接监督下能完成简单的环钻活检' },
      { id: 'epa4-l3', level: 3, label: '独立级', criteria: '能独立完成标准活检操作，缝合质量良好' },
      { id: 'epa4-l4', level: 4, label: '指导级', criteria: '能处理活检并发症并指导他人操作技术' },
    ],
  },
  {
    id: 'epa-derm-5', code: 'EPA-5', name: '皮肤镜图像分析',
    description: '能正确操作皮肤镜设备，系统扫查皮损并识别典型特征，给出合理诊断建议。',
    category: '诊断技术', weight: 1.5,
    milestones: [
      { id: 'epa5-l1', level: 1, label: '观察级', criteria: '了解皮肤镜基本原理和常见特征名称' },
      { id: 'epa5-l2', level: 2, label: '协助级', criteria: '能在指导下操作设备并识别典型特征' },
      { id: 'epa5-l3', level: 3, label: '独立级', criteria: '能独立完成系统扫查并给出初步诊断' },
      { id: 'epa5-l4', level: 4, label: '指导级', criteria: '能分析复杂病例并指导他人图像判读' },
    ],
  },
  {
    id: 'epa-derm-6', code: 'EPA-6', name: '过敏原检测操作',
    description: '能完成斑贴试验的全过程，包括贴敷、判读和患者宣教。',
    category: '治疗操作', weight: 1.0,
    milestones: [
      { id: 'epa6-l1', level: 1, label: '观察级', criteria: '了解斑贴试验原理和变应原系列' },
      { id: 'epa6-l2', level: 2, label: '协助级', criteria: '在指导下能完成贴敷操作' },
      { id: 'epa6-l3', level: 3, label: '独立级', criteria: '能独立完成斑贴试验全流程并准确判读' },
      { id: 'epa6-l4', level: 4, label: '指导级', criteria: '能处理复杂反应模式并指导他人判读' },
    ],
  },
  {
    id: 'epa-derm-7', code: 'EPA-7', name: '患者沟通与知情同意',
    description: '能与患者进行有效沟通，完成知情同意、操作说明和术后指导。',
    category: '沟通能力', weight: 1.2,
    milestones: [
      { id: 'epa7-l1', level: 1, label: '观察级', criteria: '了解知情同意的法律要求和沟通基本原则' },
      { id: 'epa7-l2', level: 2, label: '协助级', criteria: '在指导下能完成基本的知情告知' },
      { id: 'epa7-l3', level: 3, label: '独立级', criteria: '能独立完成规范的知情同意和术后宣教' },
      { id: 'epa7-l4', level: 4, label: '指导级', criteria: '能在复杂场景下进行有效沟通并指导他人' },
    ],
  },
  {
    id: 'epa-derm-8', code: 'EPA-8', name: '临床意义阐述与诊断思维',
    description: '能正确解释检查结果的临床意义，结合临床表现进行综合判断和决策。',
    category: '沟通能力', weight: 1.3,
    milestones: [
      { id: 'epa8-l1', level: 1, label: '观察级', criteria: '了解常见检查结果的基本含义' },
      { id: 'epa8-l2', level: 2, label: '协助级', criteria: '能在指导下解释基本检查结果' },
      { id: 'epa8-l3', level: 3, label: '独立级', criteria: '能独立进行结果阐述并结合临床综合判断' },
      { id: 'epa8-l4', level: 4, label: '指导级', criteria: '能进行复杂病例分析并指导他人诊断思维' },
    ],
  },
];
