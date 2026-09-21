export class HttpError extends Error {

    constructor(public statusCode: number, message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

    }

}

export class NotFoundError extends HttpError {
    constructor(message: string = "Resource Not Found") {
        super(404, message);
    }
}

export class BadRequestException extends HttpError {
    constructor(message = "Bad Request") {
        super(400, message);
    }
}

export class ConflictException extends HttpError {
    constructor(message = "Already exists") {
        super(400, message);
    }
}

export class UnauthorizedException extends HttpError {
    constructor(message = "Unauthorized") {
        super(401, message);
    }

}

export class ForbiddenException extends HttpError {
    constructor(message = "Forbidden") {
        super(403, message);
    }

}


export class InternalServerError extends HttpError {
    constructor(message = "Server Error") {
        super(500, message);
    }

}