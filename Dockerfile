FROM mhart/alpine-node

# Do not override these
ENV BOTDIR /opt/bot
ENV HUBOT_PORT 8080
# You can override anything below
ENV HUBOT_NAME dockerbot
ENV HUBOT_ADAPTER hipchat
ENV HUBOT_HIPCHAT_RECONNECT true
ENV HUBOT_HIPCHAT_JOIN_PUBLIC_ROOMS false
ENV HUBOT_HIPCHAT_JOIN_ROOMS_ON_INVITE false
ENV HUBOT_HIPCHAT_RECONNECT true

EXPOSE ${HUBOT_PORT}
WORKDIR ${BOTDIR}

ADD . .
RUN npm install

CMD ["bin/hubot", "--adapter", $HUBOT_ADAPTER]
