import { IGeo } from './geo.type';
import { IUserRole } from './userRole.type';
import { IAddress } from './address.type';
import { IComment } from './comment.type';

export interface IUser {
	id: string;
	userRoleId?: number;
	userType: 'ADMIN' | 'MOD' | 'SEG_ADMIN' | 'SEG_MOD' | 'MUNICIPAL_SEG_ADMIN' | 'BUSINESS' | 'NORMAL';
	email: string;
	password?: string;
	fname?: string;
	lname?: string;
	createdAt: Date;
	updatedAt: Date;

	// Relationships can be nullable
	geo?: IGeo;
	work_geo?: IGeo;
	school_geo?: IGeo;
	address?: IAddress;
	userRole?: IUserRole;

	IdeaComments?: IComment[]
}
