# Online Questions
This is an adaptation of the [onlinequestions.org](https://onlinequestions.org/) website, originally authored by [Thorsten Thormählen](https://www.thormae.de/). I claim no ownership of his work. The app he wrote suited my needs for a project and so I'm paying it forward by sharing my enhancements under the same license that Professor Thormählen originally used.

## Building the Linux Container Image
I use [podman](https://podman.io/) to build this app, with the following command:

`podman build --tag <TAG> --format docker .`

I use the docker manifest format to comply with my container hosting company's requirements. You may be able to omit that flag depending on your intended production environment.

## Running the app from a container
You can run this app without persistent storage just by issuing a basic run command:

`podman run -d -P --name onlinequestions <IMAGE_NAME:TAG>`

However, you will lose state when the container stops. If you want to preserve the different question-gathering sessions, you need to mount persistent storage that points to `/var/www/html/events` within the container. On a personal workstation, you can use a bind mount for this:

`podman run -d -P --name onlinequestions --mount=type=bind,src=<PATH_TO_HOST_DIR>,dst=/var/www/html/events,U=true <IMAGE_NAME:TAG>`

## Vendored components
The `jquery-ui` folder and all of its contents are vendored from [jqueryui.com](https://jqueryui.com/) along with a legacy version of [jQuery](https://jquery.com/) itself. The Dockerfile in this project specifies a particular version of the official PHP + Apache container that works with this code.

## Security disclaimer
The project's author makes no statements about the security of the original application, and I'm not making any statements about the security of this containerized version.

* Anyone who correctly guesses an event ID will be able to view all of the questions and question rankings for that event.
* The event administration UI is only as secure as the strength of the password that is assigned by the event administrator.
* Any known vulnerabilites in the PHP + Apache container, legacy jQuery library, or legacy jQuery-UI library used by this application are security risks for this application.
