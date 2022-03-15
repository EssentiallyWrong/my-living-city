const passport = require('passport');

const express = require('express');
const proposalRouter = express.Router();
const prisma = require('../lib/prismaClient');
const { checkIdeaThresholds } = require('../lib/prismaFunctions');
const { isInteger, isEmpty } = require('lodash');

const fs = require('fs');

const multer = require('multer');

//multer storage policy, including file destination and file naming policy
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/ideaImage');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

//file filter policy, only accept image file
const theFileFilter = (req, file, cb) => {
    console.log(file);
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/tiff' || file.mimetype === 'image/webp' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(new Error('file format not supported'), false);
    }
}

//const variable for 10MB max file size in bytes
const maxFileSize = 10485760;

//multer upload project, setting receiving mode and which key components to use
const upload = multer({ storage: storage, limits: { fileSize: maxFileSize }, fileFilter: theFileFilter }).single('imagePath');


// post request to create an idea
proposalRouter.post(
    '/create',
    passport.authenticate('jwt', { session: false }),
    //upload.single('imagePath'),
    async (req, res) => {
        upload(req, res, async function (err) {
            //multer error handling method
            let error = '';
            let errorMessage = '';
            let errorStack = '';
            if (err) {
                console.log(err);
                error += err + ' ';
                errorMessage += err + ' ';
                errorStack += err + ' ';
            };
            try {
                //if there's no object in the request body
                if (isEmpty(req.body)) {
                    return res.status(400).json({
                        message: 'The objects in the request body are missing',
                        details: {
                            errorMessage: 'Creating an idea must supply necessary fields explicitly.',
                            errorStack: 'necessary fields must be provided in the body with a valid id found in the database.',
                        }
                    })
                }

                console.log(req.body);

                // passport middleware provides this based on JWT
                const { email, id } = req.user;

                const theUserSegment = await prisma.userSegments.findFirst({ where: { userId: id } });

                const { homeSuperSegId, workSuperSegId, schoolSuperSegId, homeSegmentId, workSegmentId, schoolSegmentId, homeSubSegmentId, workSubSegmentId, schoolSubSegmentId } = theUserSegment;

                //Image path holder
                let imagePath = '';
                //if there's req.file been parsed by multer
                if (req.file) {
                    //console.log(req.file);
                    imagePath = req.file.path;
                }

                let { categoryId, superSegmentId, segmentId, subSegmentId, banned, title,
                    description,
                    communityImpact,
                    natureImpact,
                    artsImpact,
                    energyImpact,
                    manufacturingImpact
                } = req.body;

                categoryId = parseInt(categoryId);

                if (subSegmentId) {
                    subSegmentId = parseInt(subSegmentId);
                } else if (segmentId) {
                    segmentId = parseInt(segmentId);
                } else if (superSegmentId) {
                    superSegmentId = parseInt(superSegmentId);
                }

                banned = (banned === 'true');

                if (banned === true) {
                    error += 'You are banned';
                    errorMessage += 'You must be un-banned before you can post ideas';
                    errorStack += 'Users can not post ideas with a pending ban status of true';
                }
                // Check if category id is added
                if (!categoryId || !isInteger(categoryId)) {
                    error += 'An Proposal must be under a specific category.';
                    errorMessage += 'Creating an idea must explicitly be supplied with a "categoryId" field.';
                    errorStack += '"CategoryId" must be defined in the body with a valid id found in the database.';
                } else {
                    const theCategory = await prisma.category.findUnique({ where: { id: categoryId } });

                    if (!theCategory) {
                        error += 'An Proposal must be under a valid category.';
                        errorMessage += 'Creating an idea must explicitly be supplied with valid a "categoryId" field.';
                        errorStack += '"CategoryId" must be defined in the body with a valid id found in the database.';
                    }
                }

                if (isInteger(subSegmentId)) {
                    theSubSegment = await prisma.subSegments.findUnique({ where: { id: subSegmentId } });

                    if (!theSubSegment) {
                        error += 'Sub segment id must be valid.';
                        errorMessage += 'Creating an idea must explicitly be supplied with a valid "subSegmentId" field.';
                        errorStack += '"subSegmentId" must be provided with a valid id found in the database.';
                    } else if (subSegmentId == homeSubSegmentId || subSegmentId == workSubSegmentId || subSegmentId == schoolSegmentId) {
                        segmentId = theSubSegment.segId;

                        const theSegment = await prisma.segments.findUnique({ where: { segId: segmentId } });

                        superSegmentId = theSegment.superSegId;
                    } else {
                        error += 'You must belongs to the subSemgent you want to post to. ';
                        errorMessage += 'Your subsegment ids don\'t match the subsegment id you porvided. ';
                        errorStack += 'User does\'t belongs to the subsegment he/she wants to post idea to. '
                    }
                } else if (isInteger(segmentId)) {
                    const theSegment = await prisma.segments.findUnique({ where: { segId: segmentId } });

                    if (!theSegment) {
                        error += 'An Proposal must belong to a municipality.';
                        errorMessage += 'Creating an idea must explicitly be supplied with a valid "segmentId" field.';
                        errorStack += '"segmentId" must be defined in the body with a valid id found in the database.';
                    } else if (segmentId == homeSegmentId || segmentId == workSegmentId || segmentId == schoolSegmentId) {
                        superSegmentId = theSegment.superSegId;
                    } else {
                        error += 'You must belongs to the semgent you want to post to. ';
                        errorMessage += 'Your segment ids don\'t match the segment id you porvided. ';
                        errorStack += 'User does\'t belongs to the segment he/she wants to post idea to. '
                    }
                } else if (isInteger(superSegmentId)) {
                    const theSuperSegment = await prisma.superSegment.findUnique({ where: { superSegId: superSegmentId } });

                    if (!theSuperSegment) {
                        error += 'An Proposal must belong to a area.';
                        errorMessage += 'Creating an idea must explicitly be supplied with a valid "superSegmentId" field.';
                        errorStack += '"segmentId" must be defined in the body with a valid id found in the database.';
                    } else if (superSegmentId != homeSuperSegId && superSegmentId != workSuperSegId && superSegmentId != schoolSegmentId) {
                        error += 'You must belongs to the superSemgent you want to post to. ';
                        errorMessage += 'Your subsegment ids don\'t match the superSegment id you porvided. ';
                        errorStack += 'User does\'t belongs to the superSegment he/she wants to post idea to. '
                    }
                } else {
                    error += 'An idea must belongs to a area';
                    errorMessage += 'Creating an idea must explicitly be supplied with a valid "superSegmentId" or "segmentId" or "subSegmentId" field.';
                    errorStack += 'One of the area id must explicitly be supplied with a valid id found in the database. '
                }



                // Parse data
                const geoData = JSON.parse(req.body.geo);
                //if geoData parse failed
                if (!typeof geoData == "object") {
                    error += 'Geo data parse error! ';
                    errorMessage += 'Something is wrong about the text string of geo data! ';
                    errorStack += 'Geo data json string parsing failed! '
                }

                const addressData = JSON.parse(req.body.addressData);

                if (!typeof addressData == "object") {
                    error += 'Address data parse error! ';
                    errorMessage += 'Something is wrong about the text string of address data! ';
                    errorStack += 'Address data json string parsing failed! '
                }

                //If there's error in error holder
                if (error || errorMessage || errorStack) {
                    //multer is a kind of middleware, if file is valid, multer will add it to upload folder. Following code are responsible for deleting files if error happened.
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                    return res.status(400).json({
                        message: error,
                        details: {
                            errorMessage: errorMessage,
                            errorStack: errorStack
                        }
                    });
                }

                const ideaData = {
                    categoryId,
                    superSegmentId,
                    segmentId,
                    subSegmentId,
                    authorId: id,
                    imagePath: imagePath,
                    title,
                    description,
                    communityImpact,
                    natureImpact,
                    artsImpact,
                    energyImpact,
                    manufacturingImpact
                };

                // Create an idea and make the author JWT bearer
                const createdProposal = await prisma.idea.create({
                    data: {
                        geo: { create: geoData },
                        address: { create: addressData },
                        ...ideaData
                    },
                    include: {
                        geo: true,
                        address: true,
                        category: true,
                    }
                });

                res.status(201).json(createdProposal);
            } catch (error) {
                console.error(error);
                res.status(400).json({
                    message: "An error occured while trying to create an Proposal.",
                    details: {
                        errorMessage: error.message,
                        errorStack: error.stack,
                    }
                });
            } finally {
                await prisma.$disconnect();
            }
        });

    }
)

proposalRouter.get(
    '/',
    async (req, res, next) => {
        try {
            res.json({
                route: 'welcome to Proposal Router'
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

// Get all Proposals
proposalRouter.get(
    '/getAll',
    async (req, res, next) => {
        try {
            const proposals = await prisma.proposal.findMany({
                include: {
                    idea:
                    {
                        include: {
                            ratings: true,
                        }
                    }
                }
            });
            res.json(proposals);
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

// Get all proposals with aggregations
proposalRouter.post(
    '/getall/with-sort',
    async (req, res, next) => {
        try {
            console.log(req.body);
            const allProposals = await prisma.proposal.findMany(req.body);

            res.status(200).json(allProposals);
        } catch (error) {
            res.status(400).json({
                message: "An error occured while trying to fetch all ideas",
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

proposalRouter.post(
    '/getall/aggregations',
    async (req, res, next) => {
        try {
            const proposals = await prisma.proposal.findMany({
                include: {
                    idea: {
                        include: {
                            ratings: true,
                        },
                    },
                },
            });
            res.json(proposals);
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

// Get all idea as well as relations with ideaId
proposalRouter.get(
    '/get/:proposalId',
    async (req, res, next) => {
        try {
            const parsedProposalId = parseInt(req.params.proposalId);

            // check if id is valid
            if (!parsedProposalId) {
                return res.status(400).json({
                    message: `A valid ideaId must be specified in the route parameter.`,
                });
            }

            const foundProposal = await prisma.proposal.findUnique({
                where: { id: parsedProposalId },
                include: {
                    idea: {
                        include: {
                            ratings: true,
                        },
                    },
                },

            });
            if (!foundProposal) {
                return res.status(400).json({
                    message: `The idea with that listed ID (${parsedProposalId}) does not exist.`,
                });
            }

            const result = { ...foundProposal };

            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            res.status(400).json({
                message: `An Error occured while trying to fetch idea with id ${req.params.ideaId}.`,
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
proposalRouter.put(
    '/update/:ideaId',
    passport.authenticate('jwt', { session: false }),
    async (req, res, next) => {
        try {
            const { email, id: loggedInUserId } = req.user;
            const { ideaId } = req.params;
            const parsedProposalId = parseInt(ideaId);
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

            if (!ideaId || !parsedProposalId) {
                return res.status(400).json({
                    message: `A valid ideaId must be specified in the route paramater.`,
                });
            }

            // Check to see if idea with id exists
            const foundProposal = await prisma.idea.findUnique({ where: { id: parsedProposalId } });
            if (!foundProposal) {
                return res.status(400).json({
                    message: `The idea with that listed ID (${ideaId}) does not exist.`,
                });
            }

            // Check to see if Proposal is the requestee's idea by JWT
            const ideaOwnedByUser = foundProposal.authorId === loggedInUserId;
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

            const updatedProposal = await prisma.idea.update({
                where: { id: parsedProposalId },
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
                message: "Proposal succesfully updated",
                idea: updatedProposal,
            })
        } catch (error) {
            res.status(400).json({
                message: "An error occured while to update an Proposal",
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
proposalRouter.delete(
    '/delete/:ideaId',
    passport.authenticate('jwt', { session: false }),
    async (req, res, next) => {
        try {
            const { id: loggedInUserId, email } = req.user;
            console.log(req.user);
            const parsedProposalId = parseInt(req.params.ideaId);

            // check if id is valid
            if (!parsedProposalId) {
                return res.status(400).json({
                    message: `A valid ideaId must be specified in the route paramater.`,
                });
            }

            // Check to see if idea exists
            const foundProposal = await prisma.idea.findUnique({ where: { id: parsedProposalId } });
            if (!foundProposal) {
                return res.status(400).json({
                    message: `The idea with that listed ID (${ideaId}) does not exist.`,
                });
            }

            // Check to see if idea is owned by user
            const ideaOwnedByUser = foundProposal.authorId === loggedInUserId;
            if (!ideaOwnedByUser) {
                return res.status(401).json({
                    message: `The user ${email} is not the author or an admin and therefore cannot delete this idea.`
                });
            }

            if (foundProposal.imagePath) {
                if (fs.existsSync(foundProposal.imagePath)) {
                    fs.unlinkSync(foundProposal.imagePath);
                }
            }

            const deleteComment = await prisma.ideaComment.deleteMany({ where: { ideaId: foundProposal.id } });
            const deleteRating = await prisma.ideaRating.deleteMany({ where: { ideaId: foundProposal.id } });

            const deletedGeo = await prisma.ideaGeo.deleteMany({ where: { ideaId: foundProposal.id } });
            const deleteAddress = await prisma.ideaAddress.deleteMany({ where: { ideaId: foundProposal.id } });
            const deletedProposal = await prisma.idea.delete({ where: { id: parsedProposalId } });

            res.status(200).json({
                message: "Proposal succesfully deleted",
                deletedProposal: deletedProposal,
            });
        } catch (error) {
            console.log(error);
            res.status(400).json({
                message: "An error occured while to delete an Proposal",
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

module.exports = proposalRouter;