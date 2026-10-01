// Thẻ chỉ số của hồ sơ tài khoản: cùng một khuôn với trang Tổng quan. `description` là dòng phụ dưới số.
import type { ReactNode } from 'react'

import BaseStatisticsCard from '@admin/views/dashboards/statistics/statistics-card-01'
import type { Tone } from '@admin/views/dashboards/tones'

type StatisticsCardProps = {
  icon: ReactNode
  value: string
  title: string
  description?: ReactNode
  tone?: Tone
  className?: string
}

const StatisticsCard = ({ description, ...props }: StatisticsCardProps) => <BaseStatisticsCard {...props} note={description} />

export default StatisticsCard
