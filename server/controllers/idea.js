const passport = require('passport');

const express = require('express');
const ideaRouter = express.Router();
const prisma = require('../lib/prismaClient');
const { checkIdeaThresholds } = require('../lib/prismaFunctions');
const { isInteger } = require('lodash');

ideaRouter.get(
  '/',
  async (req, res, next) => {
    try {
      res.json({
        route: 'welcome to Idea Router'
      })
    } catch (error) {
			res.status(400).json({
				message: error.message,
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
			})
    }
  }
)

// Get all Ideas
ideaRouter.get(
  '/getall',
  async (req, res, next) => {
    try {
      const allIdeas = await prisma.idea.findMany({
        orderBy: {
          updatedAt: 'desc'
        }
      });

      res.status(200).json(allIdeas);
    } catch (error) {
      res.status(400).json({
        message: "An error occurred while trying to fetch all ideas",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

// Get all ideas with aggregations
ideaRouter.post(
  '/getall/with-sort',
  async (req, res, next) => {
    try {
      console.log(req.body);
      const allIdeas = await prisma.idea.findMany(req.body);

      res.status(200).json(allIdeas);
    } catch (error) {
      res.status(400).json({
        message: "An error occurred while trying to fetch all ideas",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

ideaRouter.post(
  '/getall/aggregations',
  async (req, res, next) => {
    const take = req.body.take;
    let takeClause = ''
    if (!!take) {
      takeClause = `limit ${take}`;
    }
    try {
      // TODO: if rating is adjusted raw query will break
      const data = await prisma.$queryRaw(`
      select
      i.id,
      i.author_id as "authorId",
      i.category_id as "categoryId",
      i.title,
      i.description,
      i.segment_id,
      i.sub_segment_id,
      coalesce(ic.total_comments + ir.total_ratings, 0) as engagements,
      coalesce(ir.avg_rating, 0) as "ratingAvg",
      coalesce(ic.total_comments, 0) as "commentCount",
      coalesce(ir.total_ratings, 0) as "ratingCount",
      coalesce(pr.pos_rating, 0) as "posRatings",
      coalesce(nr.neg_rating, 0) as "negRatings",
      coalesce(sn.segment_name, '') as "segmentName",
      coalesce(sbn.sub_segment_name, '') as "subSegmentName",
      i.state,
      i.active,
      i.updated_at as "updatedAt",
      i.created_at as "createdAt"
        from idea i
        -- Aggregate total comments
        left join (
            select
              idea_id,
              count(id) as total_comments
            from idea_comment
            group by idea_comment.idea_id
        ) ic on i.id = ic.idea_id
        -- Aggregate total ratings and rating avg
        left join (
            select
              idea_id,
              count(id) as total_ratings,
              avg(rating) as avg_rating
            from idea_rating
            group by idea_rating.idea_id
        ) ir on	i.id = ir.idea_id
        -- Aggregate total neg ratings
        left join (
            select
              idea_id,
              count(id) as neg_rating
            from idea_rating
            where rating < 0
            group by idea_id
        ) nr on	i.id = nr.idea_id
        -- Aggregate total pos ratings
        left join (
            select
              idea_id,
              count(id) as pos_rating
            from idea_rating
            where rating > 0
            group by idea_id
        ) pr on	i.id = pr.idea_id
        -- Aggregate idea segment name
        left join (
            select seg_id, segment_name
            from segment
            ) sn on i.segment_id = sn.seg_id
        -- Aggregate idea sub segment name
        left join (
            select seg_id, sub_segment_name
            from sub_segment
            ) sbn on i.sub_segment_id = sbn.seg_id
        order by
          "ratingCount" desc,
          "ratingAvg" desc,
          engagements desc
        ${takeClause}
        ;
      `);

      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        message: "An error occurred while trying to fetch all ideas",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

// Get all idea as well as relations with ideaId
ideaRouter.get(
  '/get/:ideaId',
  async (req, res, next) => {
    try {
      const parsedIdeaId = parseInt(req.params.ideaId);

      // check if id is valid
      if (!parsedIdeaId) {
        return res.status(400).json({
          message: `A valid ideaId must be specified in the route parameter.`,
        });
      }

      const {
        isChampionable
      } = await checkIdeaThresholds(parsedIdeaId);

      const foundIdea = await prisma.idea.findUnique({
        where: { id: parsedIdeaId },
        include: {
          // TODO: Is this necessary? SQL query will join 9-10 times.
          geo: true,
          address: true,
          category: true,
          segment:true, //
          subSegment: true, // worked, GET retrieve table 
          projectInfo: true, // worked, GET retrieve table 
          proposalInfo: true,
          champion: {
            include: {
              address: {
                select: {
                  postalCode: true,
                  streetAddress: true,
                }
              }
            }
          },
          author: {
            include: {
              address: {
                select: {
                  postalCode: true,
                  streetAddress: true,
                }
              }
            }
          }
        }
      });
      if (!foundIdea) {
        return res.status(400).json({
          message: `The idea with that listed ID (${parsedIdeaId}) does not exist.`,
        });
      }

      const result = { ...foundIdea, isChampionable };
      delete result.author.password;
      if (!!result.champion) {
        delete result.champion.password;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        message: `An Error occurred while trying to fetch idea with id ${req.params.ideaId}.`,
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)


// Put request to update data
ideaRouter.put(
  '/update/:ideaId',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { email, id: loggedInUserId } = req.user;
      const { ideaId } = req.params;
      const parsedIdeaId = parseInt(ideaId);
      const {
        title,
        description,
        communityImpact,
        natureImpact,
        artsImpact,
        energyImpact,
        manufacturingImpact,
        // TODO: If these fields are not passed will break code
				geo: {
					lat,
					lon
				},
				address: {
					streetAddress,
					streetAddress2,
					city,
					country,
					postalCode,
				},
      } = req.body;

      if (!ideaId || !parsedIdeaId) {
        return res.status(400).json({
          message: `A valid ideaId must be specified in the route parameter.`,
        });
      }

      // Check to see if idea with id exists
      const foundIdea = await prisma.idea.findUnique({ where: { id: parsedIdeaId }});
      if (!foundIdea) {
        return res.status(400).json({
          message: `The idea with that listed ID (${ideaId}) does not exist.`,
        });
      }

      // Check to see if Idea is the requestee's idea by JWT
      const ideaOwnedByUser = foundIdea.authorId === loggedInUserId;
      if (!ideaOwnedByUser) {
        return res.status(401).json({
          message: `The user ${email} is not the author or an admin and therefore cannot edit this idea.`
        });
      }

      // Conditional add params to update only fields passed in 
			const updateGeoData = {
				...lat && { lat },
				...lon && { lon }
			}

			const updateAddressData = {
				...streetAddress && { streetAddress },
				...streetAddress2 && { streetAddress2 },
				...city && { city },
				...country && { country },
				...postalCode && { postalCode },
			}

      const updateData = {
					...title && { title },
					...description && { description },
					...communityImpact && { communityImpact },
					...natureImpact && { natureImpact },
					...artsImpact && { artsImpact },
					...energyImpact && { energyImpact },
					...manufacturingImpact && { manufacturingImpact },
      };

      const updatedIdea = await prisma.idea.update({
        where: { id: parsedIdeaId },
        data: {
          geo: { update: updateGeoData },
          address: { update: updateAddressData },
          ...updateData,
        },
        include: {
          geo: true,
          address: true,
        }
      });

      console.log("Returns here")
      res.status(200).json({
        message: "Idea successfully updated",
        idea: updatedIdea,
      })
    } catch (error) {
      res.status(400).json({
        message: "An error occurred while to update an Idea",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

// post request to create an idea
ideaRouter.post(
  '/create',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      let error = '';
      let errorMessage = '';
      let errorStack = '';
      // passport middleware provides this based on JWT
      const { email, id } = req.user;
      const { categoryId , segmentId, subSegmentId} = req.body;

      // Check if category id is added
      if (!categoryId||!isInteger(categoryId)) {
        error+='An Idea must be under a specific category.';
        errorMessage+='Creating an idea must explicitly be supplied with a "categoryId" field.';
        errorStack+='"CategoryId" must be defined in the body with a valid id found in the database.';
      }

      if(!segmentId||!isInteger(segmentId)){
        error+='An Idea must belongs to a segment.';
        errorMessage+='Creating an idea must explicitly be supplied with a "segmentId" field.';
        errorStack+='"segmentId" must be defined in the body with a valid id found in the database.';
      }else{
        const result = await prisma.segments.findUnique({
          where:{segId:segmentId}
        });

        if(!result){
          error+='An Idea must belongs to a segment.';
          errorMessage+='Creating an idea must explicitly be supplied with a "segmentId" field.';
          errorStack+='"segmentId" must be defined in the body with a valid id found in the database.';
        }
      }

      if(!subSegmentId||!isInteger(subSegmentId)){
        error+='An Idea must belongs to a subsegment.';
        errorMessage+='Creating an idea must explicitly be supplied with a "subSegmentId" field.';
        errorStack+='"subSegmentId" must be defined in the body with a valid id found in the database.';
      }else{
        const result = await prisma.subSegments.findUnique({
          where:{id:subSegmentId}
        });

        if(!result){
          error+='An Idea must belongs to a subsegment.';
          errorMessage+='Creating an idea must explicitly be supplied with a "subSegmentId" field.';
          errorStack+='"subSegmentId" must be defined in the body with a valid id found in the database.';
        }
      }

      //If there's error in error holder
      if(error||errorMessage||errorStack){
        return res.status(400).json({
            message: error,
            details: {
              errorMessage: errorMessage,
              errorStack: errorStack
            }
        });
      }

      // Parse data
      const geoData = { ...req.body.geo };
      const addressData = { ...req.body.address };
      // const segmentData = { ...req.body.segment}; //
      // const subSegmentData = { ...req.body.subSegment}; //
      delete req.body.geo;
      delete req.body.address;
      // delete req.body.segment; // 
      // delete req.body.subSegment; //


      const ideaData = {
        ...req.body,
        authorId: id
      };

      // Create an idea and make the author JWT bearer
      const createdIdea = await prisma.idea.create({
        data: {
          geo: { create: geoData },
          address: { create: addressData },
          // segment: { create: segmentData}, //
          // subSegment: { create: subSegmentData}, //
          ...ideaData
        },
        include: {
          geo: true,
          address: true,
          category: true,
          segment: true, // post retrieve work
          subSegment: true // post retrieve work
        }
      });

      res.status(201).json(createdIdea);
    } catch (error) {
      console.error(error);
      res.status(400).json({
        message: "An error occurred while trying to create an Idea.",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

// delete request to delete an idea
ideaRouter.delete(
  '/delete/:ideaId',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { id: loggedInUserId, email } = req.user;
      const parsedIdeaId = parseInt(req.params.ideaId);

      // check if id is valid
      if (!parsedIdeaId) {
        return res.status(400).json({
          message: `A valid ideaId must be specified in the route parameter.`,
        });
      }

      // Check to see if idea exists
      const foundIdea = await prisma.idea.findUnique({ where: { id: parsedIdeaId }});
      if (!foundIdea) {
        return res.status(400).json({
          message: `The idea with that listed ID (${ideaId}) does not exist.`,
        });
      }

      // Check to see if idea is owned by user
      const ideaOwnedByUser = foundIdea.authorId === loggedInUserId;
      if (!ideaOwnedByUser) {
        return res.status(401).json({
          message: `The user ${email} is not the author or an admin and therefore cannot delete this idea.`
        });
      }

      const deletedIdea = await prisma.idea.delete({ where: { id: parsedIdeaId }});

      res.status(200).json({
        message: "Idea successfully deleted",
        deletedIdea: deletedIdea,
      });
    } catch (error) {
      res.status(400).json({
        message: "An error occurred while to delete an Idea",
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }
)

module.exports = ideaRouter;