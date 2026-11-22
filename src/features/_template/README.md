# Feature: [Feature Name]

## 概要

このフィーチャーの目的と機能を記述

## 構造

- `api/<name>-api.ts` - 取得の関数（サーバー側で動く。関数の中で保存先を読む）
- `api/<name>-actions.ts` - 更新の関数（先頭に `'use server'`）
- `types/` - 型定義

画面の部品はフィーチャーの外（`src/app/<name>/`）に置く。

## 使用方法

```typescript
import { getFeatureNameData, createFeatureName } from '@/features/feature-name'
```
