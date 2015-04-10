mkfifo ./tail_logs
gtail -F --lines=0 ./test1.log | awk '{print "[app_log_0] - " $0}' > ./tail_logs &
gtail -F --lines=0 ./test2.log | awk '{print "[app_log_1] - " $0}' > ./tail_logs &
gtail -F --lines=0 ./test3.log | awk '{print "[app_log_2] - " $0}' > ./tail_logs &
cat ./tail_logs
#nc -u 127.0.0.1 8008 < ./tail_logs
