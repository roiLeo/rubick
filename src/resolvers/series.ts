import { Arg, Query, Resolver } from 'type-graphql'
import type { EntityManager } from 'typeorm'
import { NFTEntity } from '../generated/model'
import { SeriesEntity } from './model/series.model'

@Resolver()
export class SeriesResolver {
  constructor(private tx: () => Promise<EntityManager>) {}

  // TODO: calculate score sold * (unique / total)
  @Query(() => [SeriesEntity])
  async seriesInsightTable(
    @Arg('limit', { nullable: true }) limit: number,
    @Arg('offset', { nullable: true }) offset: string,
  ): Promise<SeriesEntity[]> {
    const manager = await this.tx()
    const result: SeriesEntity[] = await manager.getRepository(NFTEntity)
      .query(`
      SELECT
        ce.id, ce.name, ce.meta_id as metadata, me.image, 
        COUNT(distinct ne.meta_id) as unique, 
        COUNT(distinct ne.current_owner) as unique_collectors, 
        COUNT(distinct ne.current_owner) as sold, 
        COUNT(ne.*) as total, 
        AVG(ne.price) as average_price, 
        MIN(ne.price) as floor_price, 
        COALESCE(SUM(e.meta::bigint), 0) as volume, 
        COUNT(e.*) as buys 
      FROM collection_entity ce 
      LEFT JOIN metadata_entity me on ce.meta_id = me.id 
      LEFT JOIN nft_entity ne on ce.id = ne.collection_id 
      JOIN event e on ne.id = e.nft_id
      WHERE e.interaction = 'BUY'
      GROUP BY ce.id, me.image, ce.name 
      ORDER BY total DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset])

    return result
  }
}
